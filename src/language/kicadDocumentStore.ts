import * as vscode from 'vscode';
import type { ParserError } from '../types';
import { SExpressionParser, type SNode } from './sExpressionParser';

export interface ParsedKiCadDocument {
  documentVersion: number;
  ast: SNode;
  errors: ParserError[];
}

export class KiCadDocumentStore {
  private readonly cache = new Map<string, ParsedKiCadDocument>();

  constructor(private readonly parser: SExpressionParser) {}

  parseDocument(document: vscode.TextDocument): ParsedKiCadDocument {
    const cacheKey = document.uri.toString();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.documentVersion === document.version) {
      return cached;
    }

    const ast = this.parser.parse(document.getText());
    const parsed: ParsedKiCadDocument = {
      documentVersion: document.version,
      ast,
      errors: this.parser.getErrors(ast)
    };
    this.cache.set(cacheKey, parsed);
    return parsed;
  }

  invalidate(uri?: vscode.Uri): void {
    if (!uri) {
      this.cache.clear();
      return;
    }
    this.cache.delete(uri.toString());
  }
}
