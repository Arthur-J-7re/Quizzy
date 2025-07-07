import Countdown, { CountdownRendererFn } from 'react-countdown';
import { useState, useMemo } from 'react';

const Completionist = () => <span>⏰ Fini !</span>;

const radius = 45;
const stroke = 8;
const normalizedRadius = radius - stroke / 2;
const circumference = 2 * Math.PI * normalizedRadius;

export function Clock({ timer }: { timer: number }) {
    
    
    // ✅ Figer la date de fin au premier render
    const targetDate = useMemo(() => Date.now() + timer, [timer]);
    const [timeLeft, setTimeLeft] = useState(() => targetDate - Date.now());
        
    const renderer = ({ total, completed, minutes, seconds }: any) => {
        if (completed) {
            return <Completionist />;
        }

        const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        const progress = Math.min(Math.max(1 - (total-1000*(1-total/timer)) / timer, 0), 1);
        console.log(total, seconds, progress )

        return (
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg width="120" height="120">
                <circle
                stroke="#eee"
                fill="none"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx="60"
                cy="60"
                />
                <circle
                stroke="#3498db"
                fill="none"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx="60"
                cy="60"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * progress}
                strokeLinecap="round"
                style={{
                    transition: 'stroke-dashoffset 1s linear',
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                }}
                />
            </svg>
            <div
                style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                }}
            >
                {formatted}
            </div>
            </div>
        );
    };

    return (
        <Countdown
            date={targetDate} // 👈 Date figée
            renderer={renderer}
            onTick={({ total }) => setTimeLeft(total)}
        />
    );
}
