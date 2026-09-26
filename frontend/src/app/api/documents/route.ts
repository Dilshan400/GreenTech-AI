import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { retrieveContext } from "@/lib/rag";

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

// Ensure the directory exists
function ensureDirExists() {
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_BASE_DIR, { recursive: true });
  }
}

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

export async function GET(req: NextRequest) {
  try {
    ensureDirExists();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const docName = searchParams.get("name");

    // 1. If a search query is provided, return matching chunks from the RAG engine
    if (query) {
      const searchResults = await retrieveContext(query, 10, 0.10);
      return new Response(JSON.stringify(searchResults), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. If a specific document name is provided, return its raw file content
    if (docName) {
      const allFiles = await getFilesRecursively(KNOWLEDGE_BASE_DIR);
      const cleanDocName = docName.replace(/\\/g, "/");
      const matched = allFiles.find(
        (f) =>
          f.relativePath === cleanDocName ||
          f.name === cleanDocName ||
          f.relativePath.endsWith("/" + cleanDocName)
      );

      if (!matched) {
        return new Response(JSON.stringify({ error: "Document not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const content = await fs.promises.readFile(matched.fullPath, "utf-8");
      return new Response(JSON.stringify({ content }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Otherwise, return the list of files in the knowledge base (recursively)
    const allFiles = await getFilesRecursively(KNOWLEDGE_BASE_DIR);

    const documentList = await Promise.all(
      allFiles.map(async (fileItem) => {
        const stats = await fs.promises.stat(fileItem.fullPath);
        const category = getCategory(fileItem.folder, fileItem.name);

        return {
          name: fileItem.relativePath,
          sizeBytes: stats.size,
          lastModified: stats.mtime.toISOString(),
          category,
        };
      })
    );

    documentList.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    return new Response(JSON.stringify(documentList), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in GET /api/documents:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDirExists();
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file found in form data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only .txt and .md files are supported." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const safeName = path.basename(file.name);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(KNOWLEDGE_BASE_DIR, safeName);
    
    await fs.promises.writeFile(filePath, buffer);
    console.log(`Successfully uploaded file: ${safeName}`);

    return new Response(JSON.stringify({ success: true, fileName: safeName }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in POST /api/documents:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    ensureDirExists();
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("name");

    if (!fileName) {
      return new Response(JSON.stringify({ error: "Missing document name parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allFiles = await getFilesRecursively(KNOWLEDGE_BASE_DIR);
    const cleanName = fileName.replace(/\\/g, "/");
    const matched = allFiles.find(
      (f) =>
        f.relativePath === cleanName ||
        f.name === cleanName ||
        f.relativePath.endsWith("/" + cleanName)
    );

    if (!matched) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await fs.promises.unlink(matched.fullPath);
    console.log(`Deleted document: ${matched.relativePath}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/documents:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
