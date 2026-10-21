import { CLAQUETE_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { ClaqueteApp } from "./ClaqueteApp";
import "./claquete.css";

mountTool({ slug: "claquete", appid: CLAQUETE_APP_ID, name: "Claquete" }, <ClaqueteApp />);
