import styles from '@/styles/components/_admin.module.css';
import { use, useState } from "react";
import { useEffect } from 'react';
import MsgModal from '@/components/adminsubpgs/MsgModal';
export default function manageRecs() {

    const [recs, setRecs] = useState([]);


    const fetchRecs = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/recruitments/', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setRecs(data);
            }
        } catch (error) {
            console.log(error)
        }
    };
    useEffect(() => {
        fetchRecs();
    }, []);
    return (
        <div className={`${styles.background}`}
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '5%'
            }}>
            <div className={styles.right} style={{ padding: '5%', flexShrink: '0', width: '100%', height: '100%' }}>
                <h3>Wybierz rekrutację do edycji</h3>
                <ul>
                    {recs.map((r, i) => (
                        <li key={i}>
                            <div className="login-button-wrapper">
                                <button
                                    type="button"
                                    className="btn btn--secondary btn--form"
                                >
                                    {r.recruitment_name}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}