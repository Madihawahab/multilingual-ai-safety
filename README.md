# Multilingual AI Safety Observatory (MASO)

An independent research platform and evaluation pipeline designed to measure how the reliability, safety, and factual accuracy of Large Language Models (LLMs) degrade outside of English.

![MASO Overview](https://img.shields.io/badge/Status-Research_Preview-blue)
![React](https://img.shields.io/badge/Frontend-React%20%7C%20TanStack-61DAFB)

## 🌍 The Language Gap

While frontier AI models exhibit highly resilient safety behaviors in English, their reliability often collapses when queried in low-resource or non-Western languages. The Observatory systematically red-teams these models to quantify "The Language Gap" — the steep drop in reliability when comparing native English prompts to perfectly translated counterparts in Hindi, Bengali, Tamil, and Vietnamese.

## 🔬 Methodology

Our evaluation pipeline consists of:
1.  **Question Bank**: 210 culturally-agnostic questions spanning 8 high-stakes domains (Health, Government, Science, etc.).
2.  **Multilingual Translation**: High-fidelity translations into 4 Indic/Asian languages (Hindi, Bengali, Tamil, Vietnamese) + English.
3.  **Model Cohort**: Evaluating 5 flagship open-weights models (`meta/llama-3.3-70b-instruct`, `mistral-7b`, `gemma-3-27b`, etc.).
4.  **LLM-as-a-Judge**: Dual-judge ensemble scoring every response on three strict failure modes:
    *   **Hallucination** (0-100)
    *   **Refusal** (0-100)
    *   **Factual Error** (0-100)
5.  **Risk Score**: An aggregated reliability and risk score assigned to each model-language pair.

*Dataset Statistics*: ~5,250 total evaluations independently audited.

## 🚀 Key Features

*   **Language Gap Explorer**: A global heatmap visualizing exactly where and how model reliability breaks down across languages.
*   **Healthcare Risk Report**: A special investigation calculating the heightened risk of deploying English-optimized models for medical queries in non-English regions.
*   **Deployment Safety Thresholds**: Dynamic monitoring classifying model safety into Safe (<15% failure), Caution (15-25%), and Unsafe (>25%).
*   **Benchmark & Failure Explorer**: A transparency tool allowing researchers to read the raw, side-by-side benchmark answers and the AI Judge's evaluation trace for all critical failures.

## 💻 Tech Stack

*   **Framework**: React 18 / Vite
*   **Routing**: TanStack Start (File-based routing)
*   **Styling**: Tailwind CSS
*   **Data Visualization**: Recharts
*   **Icons**: Lucide React

## 🛠️ Local Development

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/multilingual-ai-safety.git
   cd multilingual-ai-safety/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The platform will be available at `http://localhost:5173`.

### Data Engine
All evaluations, translations, and benchmarking logic are statically bundled and parsed in real-time by the internal data engine located at `src/lib/observatory-data.ts`. The raw evaluation results are processed from `benchmark_results.json` and mapped against exact question translations in `translations.json`.

## 📄 License
This project and its associated benchmark dataset are released under the [CC-BY License](https://creativecommons.org/licenses/by/4.0/). Findings are advisory and intended for AI safety research.