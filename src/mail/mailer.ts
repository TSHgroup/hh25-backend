import { Resend } from "resend";
import { MJMLTemplates } from "./template";

const resend = new Resend(process.env.RESEND_KEY!);

export const sendMail = (receiver: string, subject: string, body: string) => {
    return resend.emails.send({
        to: receiver,
        from: process.env.RESEND_EMAIL!,
        html: body,
        subject
    });
}

export const sendTemplate = (receiver: string, subject: string, template: string, context: Record<string, string>) => {
    const mjml = MJMLTemplates.getTemplate(template);
    if (!mjml) throw "Invalid template: " + template;
    const rendered = mjml.render(context);

    return sendMail(receiver, subject, rendered);
}