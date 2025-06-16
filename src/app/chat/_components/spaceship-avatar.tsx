import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  position: { x: number; y: number };
}

interface SpaceshipAvatarProps {
  user: User;
  isCurrentUser: boolean;
  isTyping: boolean;
  isBeingDragged: boolean;
  onMouseDown: (e: React.MouseEvent, userId: string) => void;
}

export default React.forwardRef<HTMLDivElement, SpaceshipAvatarProps>(
  function SpaceshipAvatar(
    { user, isCurrentUser, isTyping, isBeingDragged, onMouseDown },
    ref
  ) {
    const animDelay = parseInt(user.id.replace(/\D/g, "")) % 5;

    const containerStyle: React.CSSProperties = {
      position: "absolute",
      // transformは親(virtual-space)で設定するため、ここでは削除
      pointerEvents: "auto",
      willChange: "transform",
    };

    const innerContainerStyle: React.CSSProperties = {
      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      transform: isBeingDragged ? "scale(1.1)" : "scale(1)",
      filter: isBeingDragged
        ? "drop-shadow(0 0 30px rgba(255, 255, 255, 0.8))"
        : "none",
      // ▼▼▼ 変更点: zIndexの管理を親コンポーネントに移動したため、この行を削除します ▼▼▼
      // zIndex: isBeingDragged ? 30 : isCurrentUser ? 25 : 20,
      // ▲▲▲ 変更ここまで ▲▲▲
      cursor: isCurrentUser ? "grab" : "default",
    };

    return (
      <div
        ref={ref}
        style={containerStyle}
        onMouseDown={(e) => onMouseDown(e, user.id)}
      >
        <div className="spaceship-anim-container" style={innerContainerStyle}>
          <div className="flex flex-col items-center relative">
            {/* エンジン推進炎エフェクト */}
            {!isBeingDragged && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div
                  className="w-8 h-16 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, ${user.color} 0%, #ffffff 30%, transparent 100%)`,
                    filter: "blur(6px)",
                    animation: "thruster 0.5s ease-in-out infinite",
                    animationDelay: `${animDelay * 0.1}s`,
                    transform: "scaleX(0.6)",
                  }}
                />
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-12 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, #ffffff 0%, ${user.color} 50%, transparent 100%)`,
                    filter: "blur(2px)",
                    animation: "thruster-inner 0.3s ease-in-out infinite",
                    opacity: 0.9,
                  }}
                />
                <div className="absolute top-0 left-1/2 -translate-x-1/2">
                  <div
                    className="w-1 h-3 bg-white rounded-full absolute"
                    style={{
                      animation: "spark 1s linear infinite",
                      left: "-4px",
                    }}
                  />
                  <div
                    className="w-1 h-3 bg-white rounded-full absolute"
                    style={{
                      animation: "spark 1s linear infinite 0.3s",
                      left: "4px",
                    }}
                  />
                </div>
              </div>
            )}

            {/* 宇宙船本体 */}
            <div className="relative">
              <div
                className={`absolute inset-0 w-20 h-20 rounded-full ${
                  isBeingDragged ? "animate-pulse" : "animate-shield"
                }`}
                style={{
                  background: `radial-gradient(circle, ${user.color}44 0%, ${user.color}22 40%, transparent 70%)`,
                  filter: "blur(10px)",
                  transform: "translate(-50%, -50%) scale(1.8)",
                  left: "50%",
                  top: "50%",
                  boxShadow: `0 0 40px ${user.color}66`,
                }}
              />
              <div
                className="absolute inset-0 w-16 h-16 rounded-full"
                style={{
                  background: "none",
                  border: `2px solid ${user.color}44`,
                  transform: "translate(-50%, -50%) scale(1.3) rotateX(70deg)",
                  left: "50%",
                  top: "50%",
                  animation: "ring-rotate 4s linear infinite",
                }}
              />
              <div
                className="relative w-16 h-16"
                style={{ transform: "rotate(45deg)" }}
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${user.color} 0%, ${user.color}cc 40%, ${user.color}88 70%, ${user.color}44 100%)`,
                    border: `2px solid ${user.color}`,
                    boxShadow: `0 0 30px ${user.color}88, inset 0 0 20px rgba(255,255,255,0.4), inset -5px -5px 10px rgba(0,0,0,0.3)`,
                  }}
                >
                  <div
                    className="absolute top-2 left-2 right-2 h-px"
                    style={{ background: "rgba(255,255,255,0.5)" }}
                  />
                  <div
                    className="absolute bottom-2 left-2 right-2 h-px"
                    style={{ background: "rgba(255,255,255,0.5)" }}
                  />
                  <div
                    className="absolute left-2 top-2 bottom-2 w-px"
                    style={{ background: "rgba(255,255,255,0.5)" }}
                  />
                  <div
                    className="absolute right-2 top-2 bottom-2 w-px"
                    style={{ background: "rgba(255,255,255,0.5)" }}
                  />
                </div>
                {/* 修正: classNameから -translate-x-1/2 -translate-y-1/2 を削除し、style属性のtransformに一本化 */}
                <div
                  className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full overflow-hidden"
                  style={{
                    transform: "translate(-50%, -50%) rotate(-45deg)",
                    background: "rgba(0,0,0,0.7)",
                    border: "2px solid rgba(255,255,255,0.6)",
                    boxShadow: "inset 0 0 10px rgba(255,255,255,0.2)",
                  }}
                >
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} />
                    <AvatarFallback
                      className="text-white font-bold text-lg"
                      style={{
                        backgroundColor: user.color,
                        textShadow: "0 0 10px rgba(255,255,255,0.8)",
                      }}
                    >
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, transparent 30%, rgba(255,255,255,0.1) 100%)",
                    }}
                  />
                </div>
                <div
                  className={`absolute -bottom-2 left-1/2 h-3 w-3 rounded-full ${
                    isTyping ? "animate-pulse" : "animate-beacon"
                  }`}
                  style={{
                    transform: "translate(-50%, 50%) rotate(-45deg)",
                    backgroundColor: isTyping ? "#fbbf24" : "#10b981",
                    boxShadow: `0 0 20px ${isTyping ? "#fbbf24" : "#10b981"}`,
                    border: "1px solid rgba(255,255,255,0.5)",
                  }}
                />
              </div>
              {!isBeingDragged && (
                <>
                  <div
                    className="absolute -top-4 -right-4 w-2 h-2 rounded-full"
                    style={{
                      background: user.color,
                      boxShadow: `0 0 10px ${user.color}`,
                      animation: "particle-orbit 3s linear infinite",
                    }}
                  />
                  <div
                    className="absolute -bottom-4 -left-4 w-2 h-2 rounded-full"
                    style={{
                      background: user.color,
                      boxShadow: `0 0 10px ${user.color}`,
                      animation: "particle-orbit 3s linear infinite 1s",
                    }}
                  />
                  <div
                    className="absolute top-1/2 -right-6 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#ffffff",
                      boxShadow: "0 0 8px #ffffff",
                      animation: "particle-orbit 3s linear infinite 2s",
                    }}
                  />
                </>
              )}
            </div>

            {/* ユーザー名表示 */}
            <div className="mt-4 flex flex-col items-center">
              <div
                className="relative px-4 py-1.5 rounded-full backdrop-blur-xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,20,30,0.8) 100%)",
                  border: `1px solid ${user.color}66`,
                  boxShadow: `0 0 20px ${user.color}44, inset 0 0 10px rgba(255,255,255,0.1)`,
                }}
              >
                <span
                  className="text-xs font-bold tracking-wider"
                  style={{
                    color: "#ffffff",
                    textShadow: `0 0 10px ${user.color}`,
                  }}
                >
                  {user.name} {isCurrentUser && "(YOU)"}
                </span>
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${user.color}22 50%, transparent 100%)`,
                    animation: "hologram-scan 3s linear infinite",
                  }}
                />
              </div>
              {isTyping && (
                <div className="mt-2 relative">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-0 px-3 py-0.5"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.4) 50%, rgba(251, 191, 36, 0.2) 100%)",
                      color: "#fbbf24",
                      boxShadow: "0 0 15px rgba(251, 191, 36, 0.6)",
                      animation: "pulse 1s ease-in-out infinite",
                    }}
                  >
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-amber-400 rounded-full animate-ping" />
                      TRANSMITTING
                    </span>
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .spaceship-anim-container {
            /* 物理シミュレーションと競合するため、上下に揺れるアニメーションは無効化 */
            /* animation-name: float-space; */
            animation-duration: 8s;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
            animation-delay: ${animDelay}s;
          }
          @keyframes float-space {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          @keyframes thruster {
            0%,
            100% {
              opacity: 0.8;
              transform: scaleY(1) scaleX(0.6);
            }
            50% {
              opacity: 1;
              transform: scaleY(1.3) scaleX(0.8);
            }
          }
          @keyframes thruster-inner {
            0%,
            100% {
              opacity: 0.9;
              transform: scaleY(1);
            }
            50% {
              opacity: 1;
              transform: scaleY(1.2);
            }
          }
          @keyframes spark {
            0% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translateY(20px) scale(0);
              opacity: 0;
            }
          }
          @keyframes ring-rotate {
            0% {
              transform: translate(-50%, -50%) scale(1.3) rotateX(70deg)
                rotateZ(0deg);
            }
            100% {
              transform: translate(-50%, -50%) scale(1.3) rotateX(70deg)
                rotateZ(360deg);
            }
          }
          @keyframes shield {
            0%,
            100% {
              opacity: 0.4;
              transform: translate(-50%, -50%) scale(1.8);
            }
            50% {
              opacity: 0.6;
              transform: translate(-50%, -50%) scale(2);
            }
          }
          @keyframes particle-orbit {
            0% {
              transform: rotate(0deg) translateX(30px) rotate(0deg);
            }
            100% {
              transform: rotate(360deg) translateX(30px) rotate(-360deg);
            }
          }
          @keyframes beacon {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.3;
            }
          }
          @keyframes hologram-scan {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    );
  }
);
