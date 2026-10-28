import { AUTOMATION_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { TramaApp } from "../trama/main";

mountTool({ slug: "automation", appid: AUTOMATION_APP_ID, name: "Trama" }, <TramaApp/>);
