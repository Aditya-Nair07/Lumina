import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const router = useNavigate();
    const [guestCode, setGuestCode] = useState('');

    const joinAsGuest = () => {
        const code = guestCode.trim() || `guest-${Math.random().toString(36).slice(2, 8)}`;
        router(`/${code}`);
    };

    return (
        <div className='landingPageContainer'>
            {/* Midnight Mist — Pattern Craft */}
            <div
                className="midnightMist"
                aria-hidden
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%),
                        radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
                        radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)
                    `,
                }}
            />

            <nav>
                <div className='navHeader'>
                    <h2 className="logoTitle">
                        <span className="logoMark">L</span>
                        Lumina
                    </h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => {
                        const el = document.getElementById('guest-join');
                        if (el) el.focus();
                    }}>Join as Guest</p>
                    <p onClick={() => router("/auth")}>Register</p>
                    <div className="navCta" onClick={() => router("/auth")} role='button'>
                        <p>Login</p>
                    </div>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="landingCopy">
                    <h1 className="brandHero">Lumina<span>.</span></h1>
                    <h2>Meet face to face, from anywhere.</h2>
                    <p>
                        Crystal-clear video, instant rooms, and effortless invites —
                        built for teams, families, and late-night catch-ups.
                    </p>
                    <div className="landingActions">
                        <Link className="btnPrimary" to={"/auth"}>Get Started</Link>
                        <button className="btnGhost" type="button" onClick={() => router("/auth")}>
                            Create account
                        </button>
                    </div>
                    <div className="guestJoinBar">
                        <input
                            id="guest-join"
                            type="text"
                            placeholder="Enter meeting code"
                            value={guestCode}
                            onChange={(e) => setGuestCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && joinAsGuest()}
                        />
                        <button type="button" onClick={joinAsGuest}>Join</button>
                    </div>
                </div>

                <div className="landingVisual">
                    <div className="landingVisualFrame">
                        <img src="/mobile.png" alt="Lumina video call preview" />
                        <div className="landingVisualOverlay">
                            <strong>Presence that feels real</strong>
                            <span>HD video · Live chat · Screen share</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
