import { PROMPT_LIBRARY_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { PromptLibraryApp } from "./PromptLibraryApp";

mountTool({ slug: "prompt-library", appid: PROMPT_LIBRARY_APP_ID, name: "Biblioteca de prompts" }, <PromptLibraryApp />);
