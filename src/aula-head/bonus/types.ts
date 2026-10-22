import type { DemoValue, LabState } from "../model";

export type BonusProps = {
  lab: LabState;
  demo: (key: string, value: DemoValue) => void;
  reduced: boolean;
};
