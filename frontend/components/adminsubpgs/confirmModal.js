export default function MsgModal({ isOpen, onCloseYes, onCloseNo, message }) {
    if (!isOpen) {
        return null;
    }

    return (
        <>
            <div
                className="modal-backdrop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="modal-content">
                    <h3 id="modal-title">
                        Powiadomienie
                    </h3>

                    <div className="mt-2">
                        <p className="text-sm text-gray-500">
                            {message}
                        </p>
                    </div>

                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={onCloseYes}
                        >
                            Tak
                        </button>
                        <button
                            type="button"
                            onClick={onCloseNo}
                        >
                            Nie
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}