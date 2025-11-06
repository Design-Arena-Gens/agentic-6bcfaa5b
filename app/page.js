'use client';

import PromptBuilder from "../components/PromptBuilder";

export default function HomePage() {
  return (
    <main className="container">
      <header className="header">
        <h1>Construtor de Prompts</h1>
        <p className="subtitle">Assistente intuitivo, din?mico e robusto para criar prompts de alta qualidade. Ele faz as perguntas certas antes de gerar o resultado.</p>
      </header>
      <PromptBuilder />
      <footer className="footer">
        <span>Feito para implantar na Vercel</span>
      </footer>
    </main>
  );
}
