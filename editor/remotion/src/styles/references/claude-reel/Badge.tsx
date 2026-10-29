import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { GraphicEvent } from "../../../lib/timeline";
import { C } from "./palette";
import { ClaudeLogo, POPPINS, Rich } from "./shared";

/**
 * Badge fisso in alto: "✳ [c]Claude[/c] ha montato il [y]100%[/y]\ndi questo video".
 * Misure dalla reference: 652x130 px, centro a y≈17,5%, testo Poppins bold 40 px.
 */
export const Badge: React.FC<{ g: GraphicEvent }> = ({ g }) => {
  const frame = useCurrentFrame();
  const [l1, l2] = (g.text ?? "[c]Claude[/c] ha montato il [y]100%[/y]\ndi questo video").split("\n");
  // nella reference il badge c'è già dal primo frame; dissolvenza solo se entra più tardi
  const o = g.from === 0 ? 1 : interpolate(frame, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: `${(g.y ?? 0.174) * 100}%`, display: "flex", justifyContent: "center", transform: "translateY(-50%)", opacity: o }}>
      <div
        style={{
          background: C.badgeBg,
          borderRadius: 16,
          padding: "12px 34px 14px",
          fontFamily: POPPINS,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.32,
          letterSpacing: -0.5,
          color: "#FFFFFF",
          textAlign: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ClaudeLogo size={34} />
          <span>
            <Rich text={l1} />
          </span>
        </div>
        {l2 && (
          <div>
            <Rich text={l2} />
          </div>
        )}
      </div>
    </div>
  );
};
