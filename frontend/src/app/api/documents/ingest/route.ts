import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getEmbedding } from "@/lib/gemini";

export const dynamic = "force-dynamic";

function getKnowledgeBaseDir(): string {
  const localDir = path.join(process.cwd(), "knowledge_base");
  if (fs.existsSync(localDir)) {
    return localDir;
  }
  const backendDir = path.join(process.cwd(), "..", "backend", "knowledge_base");
  if (fs.existsSync(backendDir)) {
    return backendDir;
  }
  return localDir;
}

const KNOWLEDGE_BASE_DIR = getKnowledgeBaseDir();
const OUTPUT_FILE = path.join(process.cwd(), "data", "knowledge.json");

interface FileEntry {
  fullPath: string;
  relativePath: string;
  name: string;
  folder: string;
}

async function getFilesRecursively(dir: string, baseDir: string = dir): Promise<FileEntry[]> {
  if (!fs.existsSync(dir)) return [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: FileEntry[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getFilesRecursively(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && (entry.name.endsWith(".txt") || entry.name.endsWith(".md"))) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const folder = path.dirname(relativePath).replace(/\\/g, "/");
      files.push({
        fullPath,
        relativePath,
        name: entry.name,
        folder: folder === "." ? "" : folder,
      });
    }
  }

  return files;
}

function getCategory(folder: string, fileName: string): string {
  const lowerFolder = folder.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (lowerFolder.includes("e_waste") || lowerName.includes("ewaste") || lowerName.includes("recycling")) {
    return "E-Waste & Recycling";
  }
  if (lowerFolder.includes("electronic_devices") || lowerName.includes("device") || lowerName.includes("laptop") || lowerName.includes("smartphone")) {
    return "Sustainable Devices";
  }
  if (lowerFolder.includes("green_electronics")) {
    return "Green Electronics";
  }
  if (lowerFolder.includes("green_purchase") || lowerFolder.includes("purchase")) {
    return "Purchase Intention";
  }
  if (lowerFolder.includes("conversation") || lowerFolder.includes("dialogue")) {
    return "Consultation Dialogues";
  }
  if (lowerFolder.includes("research") || lowerName.includes("research") || lowerName.includes("survey") || lowerName.includes("tpb")) {
    return "Academic Research";
  }
  return "General Knowledge";
}

// Helper to chunk text
function chunkText(text: string, maxChars: number = 800, overlap: number = 150): string[] {
  const chunks: string[] = [];
  const cleanedText = text.replace(/\r\n/g, "\n");
  let currentStart = 0;
  
  while (currentStart < cleanedText.length) {
    let currentEnd = currentStart + maxChars;
    if (currentEnd >= cleanedText.length) {
      chunks.push(cleanedText.substring(currentStart).trim());
      break;
    }
    
    let breakPoint = currentEnd;
    const searchRange = cleanedText.substring(currentStart, currentEnd);
    const lastDoubleNew = searchRange.lastIndexOf("\n\n");
    if (lastDoubleNew > maxChars * 0.6) {
      breakPoint = currentStart + lastDoubleNew;
    } else {
      const lastSingleNew = searchRange.lastIndexOf("\n");
      if (lastSingleNew > maxChars * 0.7) {
        breakPoint = currentStart + lastSingleNew;
      } else {
        const lastSpace = searchRange.lastIndexOf(" ");
        if (lastSpace > maxChars * 0.8) {
          breakPoint = currentStart + lastSpace;
        }
      }
    }
    
    const chunk = cleanedText.substring(currentStart, breakPoint).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    currentStart = breakPoint - overlap;
    if (currentStart >= breakPoint) currentStart = breakPoint;
  }
  return chunks.filter((c) => c.length > 10);
}

export async function POST(req: NextRequest) {
  try {
    console.log("API Ingestion triggered...");
    
    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
      fs.mkdirSync(KNOWLEDGE_BASE_DIR, { recursive: true });
      return new Response(JSON.stringify({ success: true, message: "Created knowledge base directory, no files found.", chunkCount: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const targetFiles = await getFilesRecursively(KNOWLEDGE_BASE_DIR);

    if (targetFiles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No text or markdown files found.", chunkCount: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allChunks: any[] = [];
    const isMockMode = !process.env.GEMINI_API_KEY;

    for (const fileItem of targetFiles) {
      const content = await fs.promises.readFile(fileItem.fullPath, "utf-8");
      const category = getCategory(fileItem.folder, fileItem.name);
      const textChunks = chunkText(content);
      
      for (let i = 0; i < textChunks.length; i++) {
        const text = textChunks[i];
        
        try {
          const embedding = await getEmbedding(text);
          const headerMatch = text.match(/^#+\s+(.+)$/m);
          const sectionHeader = headerMatch ? headerMatch[1] : undefined;

          allChunks.push({
            id: `${fileItem.name}-chunk-${i}`,
            text,
            embedding,
            metadata: {
              documentName: fileItem.relativePath,
              category,
              sectionHeader,
            },
          });
          
          if (!isMockMode) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (embeddingError) {
          console.error(`Error embedding chunk ${i} of ${fileItem.relativePath}:`, embeddingError);
          if (!isMockMode) {
            throw new Error(`Embedding generation failed for ${fileItem.relativePath} chunk ${i}: ${embeddingError}`);
          }
        }
      }
    }

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify({ chunks: allChunks }, null, 2), "utf-8");
    console.log(`Dynamic Ingestion Complete. Indexed ${allChunks.length} chunks.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully re-indexed knowledge base. Ingested ${allChunks.length} total chunks from ${targetFiles.length} files.`,
        chunkCount: allChunks.length,
        mode: isMockMode ? "offline" : "live",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in POST /api/documents/ingest:", error);
    return new Response(JSON.stringify({ error: "Ingestion failed: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
