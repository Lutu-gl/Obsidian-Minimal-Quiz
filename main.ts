import { App, Component, Editor, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MinimalQuizSettings {
    alignment: 'left' | 'center';
    blurBackground: boolean;
}

const DEFAULT_SETTINGS: MinimalQuizSettings = {
    alignment: 'center',
    blurBackground: true
};

export default class MinimalQuizPlugin extends Plugin {
    settings: MinimalQuizSettings;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new MinimalQuizSettingTab(this.app, this));

        this.addRibbonIcon('checkbox-glyph', 'Start quiz', () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                const editor = activeView.editor;
                this.startQuiz(editor);
            } else {
                new Notice('No active markdown editor found.');
            }
        });

        this.addCommand({
            id: 'show-questions-modal',
            name: 'Start quiz on current file',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.startQuiz(editor);
            },
        });
    }

    startQuiz(editor: Editor) {
        const content = editor.getValue();
        const qaMap = this.extractQuestionsAndAnswers(content);
        const entries = Array.from(qaMap.entries());
        if (entries.length > 0) {
            const filePath = this.app.workspace.getActiveFile()?.path ?? 'unknown';

            new QuestionsModal(this.app, entries, this.settings, filePath).open();
        } else {
            new Notice('No questions found.');
        }
    }

    extractQuestionsAndAnswers(content: string): Map<string, string> {
        const qaMap = new Map<string, string>();
        const regex = /(.*\?)\n([\s\S]*?)(?=\n\n|$)/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const question = match[1].trim();
            const answer = match[2].trim();
            if (question && answer) {
                qaMap.set(question, answer);
            }
        }

        return qaMap;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class QuestionsModal extends Modal {
    entries: [string, string][];
    answerVisible = false;
    currentIndex = 0;
    settings: MinimalQuizSettings;
    component: Component;
    sourcePath: string;

    constructor(app: App, questions: [string, string][], settings: MinimalQuizSettings, sourcePath: string) {
        super(app);
        this.entries = questions;
        this.settings = settings;
        this.component = new Component();
        this.sourcePath = sourcePath;
    }

    onOpen() {
        const { modalEl } = this;

        // blur of the background
        const bgEl = modalEl.parentElement;
        if (bgEl && this.settings.blurBackground) {
            bgEl.classList.remove("quiz-no-blur");
            bgEl.classList.add("quiz-blur");            
        } else if (bgEl) {
            bgEl.classList.remove("quiz-blur");
            bgEl.classList.add("quiz-no-blur");            
        }

        this.registerKeys();
        this.render();
    }

    registerKeys() {
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.component.registerDomEvent(window, "keydown", this.handleKeyPress);
    }

    handleKeyPress(event: KeyboardEvent) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.toggleAnswer();
        }
    }
    
    render() {
        const { contentEl } = this;
        contentEl.empty();

        if (this.currentIndex >= this.entries.length) {
            new Notice('You finished the quiz - good job!');
            this.close();
            return;
        }

        const progressText = `${this.currentIndex + 1}/${this.entries.length}`;
        const progressEl = contentEl.createEl('div', {
            text: `Progress: ${progressText}`,
        });
        progressEl.classList.add('quiz-progress');

        const [question, answer] = this.entries[this.currentIndex];

        const questionContainer = contentEl.createEl('div');
        this.renderQuestion(question, questionContainer);
        const answerContainer = contentEl.createEl('div');
        if (this.answerVisible) {
            this.renderAnswer(answer, answerContainer);
        }

        const isLastQuestion = this.currentIndex === this.entries.length - 1;
        const buttonText = this.answerVisible
            ? (isLastQuestion ? 'Finish quiz' : 'Next question')
            : 'Show answer';

        const button = contentEl.createEl('button', {
            text: buttonText,
        });

        button.classList.add('quiz-button');

        button.addEventListener('click', () => this.toggleAnswer());

        contentEl.classList.remove('quiz-align-left', 'quiz-align-center');
        contentEl.classList.add(
            this.settings.alignment === 'center' ? 'quiz-align-center' : 'quiz-align-left'
        );
        
    }
    renderQuestion(question: string, questionContainer: HTMLElement) {
        this.component.load();
        MarkdownRenderer.render(this.app, question, questionContainer, this.sourcePath, this.component);
    }

    renderAnswer(answer: string, answerContainer: HTMLElement){
        this.component.load();
        MarkdownRenderer.render(this.app, answer, answerContainer, this.sourcePath, this.component); 
    }

    toggleAnswer() {
        if (this.answerVisible) {
            this.currentIndex++;
            this.answerVisible = false;
        } else {
            this.answerVisible = true;
        }
        this.render();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.component.unload();
    }
}

class MinimalQuizSettingTab extends PluginSettingTab {
    plugin: MinimalQuizPlugin;

    constructor(app: App, plugin: MinimalQuizPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Modal alignment')
            .setDesc('Choose the alignment of the modal content.')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .setValue(this.plugin.settings.alignment)
                    .onChange(async (value: 'left' | 'center') => {
                        this.plugin.settings.alignment = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Blur background')
            .setDesc('Enable or disable background blur when the modal is open.')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.blurBackground)
                    .onChange(async (value) => {
                        this.plugin.settings.blurBackground = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}