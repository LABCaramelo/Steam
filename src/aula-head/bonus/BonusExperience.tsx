import { PublicationMap, VersionHistory } from "./FlowAndHistory";
import { DeploySimulator, DomainSimulator } from "./DeployAndDomain";
import type { BonusProps } from "./types";
import "./bonus.css";

export function BonusExperience({ index, ...props }: BonusProps & { index: number }) {
  switch (index) {
    case 16: return <PublicationMap {...props} />;
    case 17: return <VersionHistory {...props} />;
    case 18: return <DeploySimulator {...props} />;
    default: return <DomainSimulator {...props} />;
  }
}
