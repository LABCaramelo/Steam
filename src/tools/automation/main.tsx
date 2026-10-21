import { AUTOMATION_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { AutomationApp } from "./AutomationApp";
import { supabaseAutomation } from "./repo";
import "./automation.css";

mountTool({ slug: "automation", appid: AUTOMATION_APP_ID, name: "Automation" }, <AutomationApp repo={supabaseAutomation}/>);
