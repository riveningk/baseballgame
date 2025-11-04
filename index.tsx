import React, { useEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";

const GAME_WIDTH = 400;
const GAME_HEIGHT = 800;
const BALL_SIZE = 30;
const HITTING_ZONE_Y = GAME_HEIGHT - 140;
const TOTAL_ROUNDS = 5;
const SPEED_LEVELS = [3, 5, 7, 9, 11];
const HOMERUN_SCORE = 20;
const FOUL_SCORE = 10;

const Bat = ({ side, hitting }) => {
  const x = side === "left" ? GAME_WIDTH / 4 : (GAME_WIDTH * 3) / 4;
  return (
    <motion.div
      animate={{ left: x - 30, scale: hitting ? [1, 1.3, 1] : 1 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "absolute",
        bottom: 60,
        width: 60,
        height: 100,
        backgroundColor: "#ffeb3b",
        border: "2px solid orange",
        borderRadius: 10,
        transform: "translateX(-50%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: 700,
        fontSize: 18,
        userSelect: "none",
        zIndex: 3,
      }}
    >
      {hitting ? "💥" : "방망이"}
    </motion.div>
  );
};

const Ball = ({ x, y }) => (
  <motion.div
    className="baseball"
    style={{
      left: x - BALL_SIZE / 2,
      top: y,
    }}
  />
);

const App = () => {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState("idle"); // idle | playing | roundEnd | gameOver
  const [batSide, setBatSide] = useState("left");
  const [isHitting, setIsHitting] = useState(false);
  const [ball, setBall] = useState({ x: 0, y: -100, dir: "left" });
  const [highlight, setHighlight] = useState(false);
  const [message, setMessage] = useState("");
  const [roundFinished, setRoundFinished] = useState(false); // 중복 처리 방지

  const speedRef = useRef(SPEED_LEVELS[0]);
  const raf = useRef(null);
  const containerRef = useRef(null);

  // 메시지 표시
  const showMsg = useCallback((text, duration = 800) => {
    setMessage(text);
    setTimeout(() => setMessage(""), duration);
  }, []);

  // 공 리셋
  const resetBall = useCallback(() => {
    const dir = Math.random() > 0.5 ? "left" : "right";
    const startX = dir === "left" ? GAME_WIDTH / 4 : (GAME_WIDTH * 3) / 4;
    speedRef.current = SPEED_LEVELS[round - 1];
    setBall({ x: startX, y: -BALL_SIZE, dir });
    setRoundFinished(false);
  }, [round]);

  // 라운드 종료
  const finishRound = useCallback(() => {
    if (roundFinished) return; // 중복 방지
    setRoundFinished(true);

    cancelAnimationFrame(raf.current);
    setGameState("roundEnd");

    if (round >= TOTAL_ROUNDS) {
      setTimeout(() => {
        setGameState("gameOver");
        showMsg(`🏆 GAME CLEAR! 총점: ${score} / 100`, 3000);
      }, 800);
    } else {
      setTimeout(() => {
        setRound((r) => r + 1);
        resetBall();
        setGameState("playing");
      }, 1000);
    }
  }, [round, roundFinished, resetBall, score, showMsg]);

  // 타격 결과
  const handleResult = useCallback(
    (type) => {
      if (roundFinished) return;
      if (type === "homerun") {
        setScore((s) => s + HOMERUN_SCORE);
        showMsg("🏏 홈런!", 1000);
      } else if (type === "foul") {
        setScore((s) => s + FOUL_SCORE);
        showMsg("💨 파울!", 1000);
      } else {
        showMsg("❌ 스트라이크!", 1000);
      }
      finishRound();
    },
    [finishRound, showMsg, roundFinished]
  );

  // 타격
  const doHit = useCallback(() => {
    if (gameState !== "playing" || roundFinished) return;
    setIsHitting(true);
    setTimeout(() => setIsHitting(false), 300);

    // 방향 안 맞으면 실패
    if (ball.dir !== batSide) return handleResult("strike");

    const dist = Math.abs(ball.y - HITTING_ZONE_Y);
    if (dist < 30) handleResult("homerun");
    else if (dist < 80) handleResult("foul");
    else handleResult("strike");
  }, [ball, batSide, gameState, handleResult, roundFinished]);

  // 공 움직임
  const loop = useCallback(() => {
    setBall((b) => {
      const newY = b.y + speedRef.current;
      if (newY > GAME_HEIGHT) {
        handleResult("strike");
        return b;
      }
      setHighlight(Math.abs(newY - HITTING_ZONE_Y) < 100);
      return { ...b, y: newY };
    });
    raf.current = requestAnimationFrame(loop);
  }, [handleResult]);

  // 게임 루프 관리
  useEffect(() => {
    if (gameState === "playing") {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(raf.current);
  }, [gameState, loop]);

  // 키 입력
  const handleKey = (e) => {
    if (gameState !== "playing") return;
    if (e.key === "ArrowLeft") setBatSide("left");
    if (e.key === "ArrowRight") setBatSide("right");
    if (e.code === "Space") doHit();
  };

  const startGame = () => {
    setRound(1);
    setScore(0);
    setGameState("playing");
    resetBall();
    setTimeout(() => containerRef.current?.focus(), 50);
  };

  return (
    <>
      <style>
        {`
        body { background:#1b5e20; color:white; display:flex; justify-content:center; padding:20px; }
        .game-area { position:relative; width:${GAME_WIDTH}px; height:${GAME_HEIGHT}px;
          background:linear-gradient(180deg,#4caf50,#2e7d32); border-radius:12px;
          box-shadow:0 10px 30px rgba(0,0,0,0.4); overflow:hidden; }
        .zone { position:absolute; left:10%; width:80%; height:60px; border:2px dashed yellow; top:${HITTING_ZONE_Y}px;
          border-radius:10px; opacity:0.5; transition:opacity 0.2s; }
        .zone.highlight { opacity:1; }
        .message {
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            width: 100%;
            padding: 0 16px;
            box-sizing: border-box;
            text-align: center;
            font-size: 36px;
            font-weight: 800;
            text-shadow: 0 4px 12px rgba(0,0,0,0.6);
            pointer-events: none;
          }
        .controls { margin-top:10px; display:flex; gap:10px; align-items:center; }
        button { padding:8px 14px; border:none; border-radius:8px; background:#1976d2; color:white; font-weight:700; cursor:pointer; }
        .baseball {
          position: absolute;
          width: ${BALL_SIZE}px;
          height: ${BALL_SIZE}px;
          border-radius: 50%;
          background: radial-gradient(circle at ${BALL_SIZE * 0.3}px ${
          BALL_SIZE * 0.3
        }px, white, #e0e0e0);
          box-shadow: inset -3px -3px 5px rgba(0,0,0,0.2);
          z-index: 2;
          overflow: hidden;
        }
        .baseball::before, .baseball::after {
          content: '';
          position: absolute;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px dashed #d32f2f;
        }
        .baseball::before {
          transform: rotate(35deg);
        }
        .baseball::after {
          transform: rotate(-35deg);
        }
      `}
      </style>

      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKey}
        style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <h2>⚾ 단순 야구게임</h2>
        <div>
          ROUND {round}/{TOTAL_ROUNDS} | SCORE {score}/100
        </div>

        <div className="game-area">
          <div className={`zone ${highlight ? "highlight" : ""}`} />
          {gameState !== "idle" && <Ball x={ball.x} y={ball.y} />}
          {gameState !== "idle" && <Bat side={batSide} hitting={isHitting} />}

          <AnimatePresence>
            {message && (
              <motion.div
                className="message"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {gameState === "gameOver" && !message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="message"
            >
              🏆 GAME CLEAR! <br/> 총점: {score}/100
            </motion.div>
          )}
        </div>

        <div className="controls">
          <button onClick={() => (gameState === "playing" ? doHit() : startGame())}>
            {gameState === "playing" ? "타격 (SPACE)" : "게임 시작"}
          </button>
          <div>← → 방향키로 위치 이동</div>
        </div>
      </div>
    </>
  );
};

const root = createRoot(document.getElementById("root"));
root.render(<App />);
