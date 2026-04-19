import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailSendResult = {
  transport: string;
  externalId?: string | null;
  outputPath?: string | null;
};

export interface MailProvider {
  send(message: MailMessage): Promise<MailSendResult>;
}

function sanitizeSegment(value: string) {
  return value.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

class FileMailProvider implements MailProvider {
  async send(message: MailMessage): Promise<MailSendResult> {
    const directory = path.join(process.cwd(), "data", "exports", "mail");
    await mkdir(directory, { recursive: true });

    const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${sanitizeSegment(message.to)}.txt`;
    const filePath = path.join(directory, filename);

    const payload = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      "",
      message.text,
      message.html ? "\n--- HTML ---\n" : "",
      message.html ?? ""
    ]
      .filter(Boolean)
      .join("\n");

    await writeFile(filePath, payload, "utf8");

    return {
      transport: "file",
      outputPath: filePath,
      externalId: null
    };
  }
}

class ResendHttpMailProvider implements MailProvider {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: MailMessage): Promise<MailSendResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html ?? undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend 邮件发送失败：${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as { id?: string };

    return {
      transport: "resend",
      externalId: payload.id ?? null,
      outputPath: null
    };
  }
}

export function createMailProvider(): MailProvider {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (apiKey && from) {
    return new ResendHttpMailProvider(apiKey, from);
  }

  return new FileMailProvider();
}
