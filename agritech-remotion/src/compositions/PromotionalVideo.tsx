import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { HeroScene } from "./scenes/HeroScene";
import { ParcelManagementScene } from "./scenes/ParcelManagementScene";
import { TaskPlanningScene } from "./scenes/TaskPlanningScene";
import { AccountingScene } from "./scenes/AccountingScene";
import { SatelliteScene } from "./scenes/SatelliteScene";
import { MultiOrgScene } from "./scenes/MultiOrgScene";
import { OutroScene } from "./scenes/OutroScene";

export const PromotionalVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={120}>
          <IntroScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <HeroScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <ParcelManagementScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <TaskPlanningScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <AccountingScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <SatelliteScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <MultiOrgScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <OutroScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
