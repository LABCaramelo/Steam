import { GRAVADOR_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { GravadorApp } from "./GravadorApp";
import "./gravador.css";

mountTool({ slug: "gravador", appid: GRAVADOR_APP_ID, name: "Gravador" }, <GravadorApp />);
