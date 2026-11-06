import { mountTool } from "../shared/mount";
import { BRAND_GUARDIAN_APP_ID } from "../../toolCatalog";
import { BrandGuardianApp } from "./BrandGuardianApp";

mountTool(
  {
    slug: "brand-guardian",
    appid: BRAND_GUARDIAN_APP_ID,
    name: "Brand Guardian",
  },
  <BrandGuardianApp />,
  {
    allowAnonymous: true,
  }
);
