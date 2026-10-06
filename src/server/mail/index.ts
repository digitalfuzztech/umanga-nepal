import "@tanstack/react-start/server-only";

import nodemailer, {
  type SendMailOptions,
  type SMTPSentMessageInfo,
  type Transporter,
} from "nodemailer";

if (typeof window !== "undefined") {
  throw new Error("The mail module can only be used on the server.");
}

export type MailErrorCode =
  | "MAIL_NOT_CONFIGURED"
  | "MAIL_CONNECTION_FAILED"
  | "MAIL_AUTH_FAILED"
  | "MAIL_SEND_FAILED";

export class MailApplicationError extends Error {
  constructor(
    public readonly code: MailErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MailApplicationError";
  }
}

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
};

export type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SafeMailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
};

const CONNECTION_TIMEOUT_MS = 15_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 30_000;

function requiredEnvironmentValue(
  name: string,
  options: { preserveWhitespace?: boolean } = {},
): string {
  const rawValue = process.env[name];
  const value = options.preserveWhitespace ? rawValue : rawValue?.trim();

  if (!value) {
    throw new MailApplicationError(
      "MAIL_NOT_CONFIGURED",
      `Mail is not configured. Missing server environment variable: ${name}.`,
    );
  }

  return value;
}

function parseSecureValue(): boolean {
  const value = requiredEnvironmentValue("SMTP_SECURE").toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new MailApplicationError(
      "MAIL_NOT_CONFIGURED",
      "Mail is not configured. SMTP_SECURE must be true or false.",
    );
  }
  return value === "true";
}

function validateEmailAddress(
  value: string,
  variableName: string,
  errorCode: MailErrorCode = "MAIL_NOT_CONFIGURED",
): string {
  if (
    value.length > 320 ||
    value.includes("\r") ||
    value.includes("\n") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  ) {
    throw new MailApplicationError(
      errorCode,
      `${variableName} must be a valid email address.`,
    );
  }
  return value;
}

function getMailConfig(): MailConfig {
  const portValue = requiredEnvironmentValue("SMTP_PORT");
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new MailApplicationError(
      "MAIL_NOT_CONFIGURED",
      "Mail is not configured. SMTP_PORT must be an integer between 1 and 65535.",
    );
  }

  const secure = parseSecureValue();
  if (port === 465 && !secure) {
    throw new MailApplicationError(
      "MAIL_NOT_CONFIGURED",
      "Mail is not configured. SMTP_SECURE must be true when SMTP_PORT is 465.",
    );
  }

  return {
    host: requiredEnvironmentValue("SMTP_HOST"),
    port,
    secure,
    username: requiredEnvironmentValue("SMTP_USERNAME"),
    password: requiredEnvironmentValue("SMTP_PASSWORD", {
      preserveWhitespace: true,
    }),
    fromAddress: validateEmailAddress(
      requiredEnvironmentValue("MAIL_FROM_ADDRESS"),
      "MAIL_FROM_ADDRESS",
    ),
    fromName: requiredEnvironmentValue("MAIL_FROM_NAME"),
  };
}

function toMailApplicationError(
  error: unknown,
  fallbackCode: MailErrorCode,
): MailApplicationError {
  if (error instanceof MailApplicationError) return error;

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  if (code === "EAUTH") {
    return new MailApplicationError(
      "MAIL_AUTH_FAILED",
      "Mail authentication failed.",
      { cause: error },
    );
  }

  if (["ECONNECTION", "EDNS", "ESOCKET", "ETIMEDOUT"].includes(code)) {
    return new MailApplicationError(
      "MAIL_CONNECTION_FAILED",
      "The mail server could not be reached securely.",
      { cause: error },
    );
  }

  return new MailApplicationError(
    fallbackCode,
    fallbackCode === "MAIL_SEND_FAILED"
      ? "The email could not be sent."
      : "The mail server connection could not be verified.",
    { cause: error },
  );
}

function validateMessageInput(input: SendMailInput): SendMailInput {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  if (recipients.length === 0) {
    throw new MailApplicationError(
      "MAIL_SEND_FAILED",
      "An email recipient is required.",
    );
  }
  for (const recipient of recipients) {
    validateEmailAddress(recipient.trim(), "Recipient", "MAIL_SEND_FAILED");
  }

  if (
    !input.subject.trim() ||
    input.subject.length > 998 ||
    input.subject.includes("\r") ||
    input.subject.includes("\n")
  ) {
    throw new MailApplicationError(
      "MAIL_SEND_FAILED",
      "A valid email subject is required.",
    );
  }
  if (!input.text.trim()) {
    throw new MailApplicationError(
      "MAIL_SEND_FAILED",
      "A plain-text email body is required.",
    );
  }
  if (input.replyTo) {
    validateEmailAddress(input.replyTo.trim(), "Reply-To", "MAIL_SEND_FAILED");
  }
  return input;
}

export function createMailTransport(): Transporter<SMTPSentMessageInfo> {
  const config = getMailConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  });
}

export async function verifyMailTransport(): Promise<true> {
  const transport = createMailTransport();
  try {
    return await transport.verify();
  } catch (error) {
    throw toMailApplicationError(error, "MAIL_CONNECTION_FAILED");
  } finally {
    transport.close();
  }
}

export async function sendMail(input: SendMailInput): Promise<SafeMailResult> {
  const message = validateMessageInput(input);
  const config = getMailConfig();
  const transport = createMailTransport();

  const options: SendMailOptions = {
    from: { name: config.fromName, address: config.fromAddress },
    to: message.to,
    subject: message.subject.trim(),
    text: message.text,
  };
  if (message.html) options.html = message.html;
  if (message.replyTo) options.replyTo = message.replyTo.trim();

  try {
    const result = await transport.sendMail(options);
    return {
      messageId: result.messageId,
      accepted: result.accepted.map(String),
      rejected: result.rejected.map(String),
      response: result.response,
    };
  } catch (error) {
    throw toMailApplicationError(error, "MAIL_SEND_FAILED");
  } finally {
    transport.close();
  }
}

export async function sendAdminNotification(
  input: Omit<SendMailInput, "to">,
): Promise<SafeMailResult> {
  const adminAddress = validateEmailAddress(
    requiredEnvironmentValue("MAIL_ADMIN_ADDRESS"),
    "MAIL_ADMIN_ADDRESS",
  );
  return sendMail({ ...input, to: adminAddress });
}
