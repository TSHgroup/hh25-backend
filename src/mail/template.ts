import fs from "fs";
import Handlebars from "handlebars";
import mjml2html from "mjml";
import path from "path";

export class MJMLTemplate {
    constructor (public templateContent: string) {}

    render(context: Record<string, string>) {
        const template = Handlebars.compile(this.templateContent);
        const compiled = template(context);

        const { html } = mjml2html(compiled);
        return html;
    }
}

export class MJMLTemplates {
    templates: Map<string, MJMLTemplate>;

    static _instance: MJMLTemplates = new MJMLTemplates();

    constructor () {
        this.templates = new Map();
    }

    static getInstance() {
        return this._instance;
    }

    static getTemplate(template: string) {
        return this.getInstance().getTemplate(template);
    }

    getTemplate(template: string) {
        return this.templates.get(template);
    }

    loadDir(dirPath: string, baseDir: string) {
        for (const file of fs.readdirSync(dirPath)) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) this.loadDir(filePath, baseDir);
            else this.loadTemplate(filePath, baseDir);
        }
    }

    loadTemplate(filePath: string, baseDir: string) {
        const content = fs.readFileSync(filePath, { encoding: "utf-8" });
        const name = path.relative(baseDir, filePath).split(".")[0].replace(/\\/g, "/");
        console.log(`Loading template ${name}`);
        this.templates.set(name, new MJMLTemplate(content));
    }

    populate(dir: string) {
        const dirPath = path.join(process.cwd(), dir);

        this.loadDir(dirPath, dirPath);
    }
}