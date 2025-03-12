import { App, Component, Editor, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MyPluginSettings {
    alignment: 'left' | 'center';
    blurBackground: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    alignment: 'center',
    blurBackground: true
};

export default class MinimalQuizPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new MinimalQuizSettingTab(this.app, this));

        this.addRibbonIcon('checkbox-glyph', 'Start Quiz', () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                const editor = activeView.editor;
                this.startQuiz(editor);
            } else {
                new Notice('No active Markdown editor found.');
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
            new QuestionsModal(this.app, entries, this.settings).open();
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
    settings: MyPluginSettings;
    component: Component;

    constructor(app: App, questions: [string, string][], settings: MyPluginSettings) {
        super(app);
        this.entries = questions;
        this.settings = settings;
        this.component = new Component();
    }

    onOpen() {
        const { modalEl } = this;
        // size of the modal
        //modalEl.style.width = "60vw";
        //modalEl.style.height = "70vh"; 
        modalEl.style.maxWidth = "800px";
        modalEl.style.maxHeight = "600px";

        // blur of the background
        const bgEl = modalEl.parentElement;
        if (bgEl && this.settings.blurBackground) {
            bgEl.style.backdropFilter = "blur(10px)";
            bgEl.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
        } else if (bgEl) {
            bgEl.style.backdropFilter = "none";
            bgEl.style.backgroundColor = "";
        }
        this.registerKeys();
        this.render();
    }

    registerKeys() {
        this.handleKeyPress = this.handleKeyPress.bind(this); 
        window.addEventListener("keydown", this.handleKeyPress);
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
            new Notice('You finished the Quiz - Good Job!');
            this.close();
            return;
        }

        const progressText = `${this.currentIndex + 1}/${this.entries.length}`;
        const progressEl = contentEl.createEl('div', {
            text: `Progress: ${progressText}`,
        });
        progressEl.style.marginBottom = '20px';

        const [question, answer] = this.entries[this.currentIndex];

        const questionContainer = contentEl.createEl('div');
        this.renderQuestion(question, questionContainer);
        const answerContainer = contentEl.createEl('div');
        if (this.answerVisible) {
            this.renderAnswer(answer, answerContainer);
        }

        const isLastQuestion = this.currentIndex === this.entries.length - 1;
        const buttonText = this.answerVisible
            ? (isLastQuestion ? 'Finish Quiz' : 'Next Question')
            : 'Show Answer';

        const button = contentEl.createEl('button', {
            text: buttonText,
        });
        button.style.marginTop = '20px';
        button.addEventListener('click', () => this.toggleAnswer());

        if (this.settings.alignment === 'center') {
            contentEl.style.textAlign = 'center';
        } else {
            contentEl.style.textAlign = 'left';
        }
    }
    renderQuestion(question: string, questionContainer: HTMLElement) {
        this.component.load();
        MarkdownRenderer.render(this.app, question, questionContainer, '', this.component);
    }

    renderAnswer(answer: string, answerContainer: HTMLElement){
        this.component.load();
        MarkdownRenderer.render(this.app, answer, answerContainer, '', this.component); 
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
        window.removeEventListener("keydown", this.handleKeyPress);
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
            .setName('Modal Alignment')
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
            .setName('Blur Background')
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