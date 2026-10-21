import { PRANCHETA_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { PranchetaApp } from "./PranchetaApp";

mountTool({ slug: "prancheta", appid: PRANCHETA_APP_ID, name: "Prancheta" }, <PranchetaApp />);
