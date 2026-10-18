declare module "mammoth" {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export function extractRawText(options: { buffer: Buffer }): Promise<MammothResult>;
  export function convertToHtml(options: { buffer: Buffer }): Promise<MammothResult>;
}
