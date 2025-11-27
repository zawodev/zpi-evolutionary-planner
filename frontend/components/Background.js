/* components/Background.js */

import React from 'react';

const styles = {
   backgroundAnimation: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
    },
    blob: {
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(80px)',
        opacity: 0.15,
        animation: 'float 20s infinite ease-in-out',
    },
    blob1: {
        width: '400px',
        height: '400px',
        background: '#3b82f6',
        top: '-50px',
        left: '-50px',
        animationDelay: '0s',
    },
    blob2: {
        width: '350px',
        height: '350px',
        background: '#a855f7',
        top: '40%',
        right: '-50px',
        animationDelay: '7s',
    },
    blob3: {
        width: '450px',
        height: '450px',
        background: '#ec4899',
        bottom: '-100px',
        left: '30%',
        animationDelay: '14s',
    },
};

export default function Background() {
    return (
        <>
            <div style={styles.backgroundAnimation}>
                <div style={{...styles.blob, ...styles.blob1}}></div>
                <div style={{...styles.blob, ...styles.blob2}}></div>
                <div style={{...styles.blob, ...styles.blob3}}></div>
            </div>
            <style>{`
                @keyframes float {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(30px, -30px) scale(1.05);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.95);
                    }
                }
            `}</style>
        </>
    );
}
