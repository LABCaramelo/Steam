import { KANBAN_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { KanbanApp } from "./KanbanApp";
import { supabaseKanban } from "./repo";
import "./kanban.css";

mountTool({ slug: "kanban", appid: KANBAN_APP_ID, name: "Kanban" }, <KanbanApp repo={supabaseKanban} />);
