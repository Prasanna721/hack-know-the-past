declare module "llamaindex" {
  // Minimal shape to satisfy usage; actual types are provided when installed
  export const ReActAgent: any;
}

declare module "@llamaindex/gemini" {
  export class Gemini {
    constructor(options: any);
  }
}
