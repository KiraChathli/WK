import { useEffect, useState } from "react";
import {
    Alert,
    Badge,
    Button,
    Card,
    Form,
    Modal,
    Spinner,
} from "react-bootstrap";
import { PencilSquare, Trash } from "react-bootstrap-icons";
import type { BallEntry, BowlerType, CollectionDifficulty, DeliveryPosition, ErrorReason, ExtraType, TakeResult, ThrowInResult, WkPosition } from "../../../../common/types";
import {
    bowlerTypes,
    deliveryPositions,
    takeResults,
    collectionDifficulties,
    errorReasons,
    throwInResults,
    extraTypes,
    wkPositions,
    successfulTakeResults,
} from "../../../../common/types";
import { SHEET_EMPTY_VALUE } from "../../../../common/consts";
import { readBallData, updateBallInSheet, deleteBallFromSheet } from "../../api/sheets";

interface BallsTabProps {
    matchId: string;
    isSignedIn: boolean;
    onBallsChanged?: () => void;
}

/** Group balls by over number, preserving their original array index */
type IndexedBall = { ball: BallEntry; index: number };
type OverGroup = { over: number; balls: IndexedBall[] };

const groupByOver = (balls: BallEntry[]): OverGroup[] => {
    const map = new Map<number, IndexedBall[]>();
    balls.forEach((ball, index) => {
        const over = ball.overCount.over;
        if (!map.has(over)) map.set(over, []);
        map.get(over)!.push({ ball, index });
    });
    return Array.from(map.entries())
        .map(([over, balls]) => ({ over, balls }))
        .sort((a, b) => b.over - a.over); // Most recent over first
};

const takeResultColor = (result: TakeResult): string => {
    if (successfulTakeResults.includes(result as any)) return "success";
    if (result === "No touch") return "secondary";
    if (result === "Catch" || result === "Stumping") return "success";
    if (result === "Missed catch" || result === "Missed stumping") return "warning";
    return "danger";
};

const shortBowlerLabel = (type: BowlerType): string => {
    const map: Record<string, string> = {
        "RA seam": "RA Seam",
        "LA seam": "LA Seam",
        "RA leg spin": "RA Leg",
        "RA off spin": "RA Off",
        "LA leg spin": "LA Leg",
        "LA off spin": "LA Off",
    };
    return map[type] || type;
};

const shortDeliveryLabel = (pos: DeliveryPosition | undefined): string => {
    if (!pos) return "No delivery";
    const map: Record<string, string> = {
        "High Off Side": "Hi Off",
        "High Straight": "Hi Str",
        "High Leg Side": "Hi Leg",
        "Waist Off Side": "W Off",
        "Waist Straight": "W Str",
        "Waist Leg Side": "W Leg",
        "Low Off Side": "Lo Off",
        "Low Straight": "Lo Str",
        "Low Leg Side": "Lo Leg",
    };
    return map[pos] || pos;
};

const BallsTab = ({ matchId, isSignedIn, onBallsChanged }: BallsTabProps) => {
    const [balls, setBalls] = useState<BallEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit modal state
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editBall, setEditBall] = useState<BallEntry | null>(null);
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchBalls = async () => {
        if (!isSignedIn || !matchId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await readBallData(matchId);
            setBalls(data);
        } catch (err) {
            console.error(err);
            setError("Failed to load ball data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalls();
    }, [isSignedIn, matchId]);

    const overGroups = groupByOver(balls);
    const maxOver = overGroups.length > 0 ? overGroups[0].over : -1;

    // --- Edit handlers ---
    const openEdit = (index: number) => {
        setEditIndex(index);
        setEditBall({ ...balls[index] });
    };

    const handleSave = async () => {
        if (editBall === null || editIndex === null) return;
        setSaving(true);
        try {
            await updateBallInSheet(editBall, matchId, editIndex);
            await fetchBalls();
            setEditIndex(null);
            setEditBall(null);
            onBallsChanged?.();
        } catch (err) {
            console.error(err);
            setError("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    // --- Delete handlers ---
    const handleDelete = async () => {
        if (deleteIndex === null) return;
        setDeleting(true);
        try {
            await deleteBallFromSheet(matchId, deleteIndex);
            setDeleteIndex(null);
            await fetchBalls();
            onBallsChanged?.();
        } catch (err) {
            console.error(err);
            setError("Failed to delete ball.");
        } finally {
            setDeleting(false);
        }
    };

    // --- Render ---
    if (loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (balls.length === 0) {
        return (
            <div className="text-center text-muted py-5">
                <p>No balls recorded for this match yet.</p>
            </div>
        );
    }

    // Determine whether a take result shows collection or error
    const showsCollection = (result: string) =>
        successfulTakeResults.includes(result as any);
    const showsError = (result: string) =>
        result !== "No touch" && !showsCollection(result);

    return (
        <>
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
                    {error}
                </Alert>
            )}

            <div className="d-flex flex-column gap-4">
                {overGroups.map((group) => (
                    <div key={group.over}>
                        {/* Over header */}
                        <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 text-uppercase fw-bold text-muted small">
                                Over {group.over + 1}
                            </h6>
                            <Badge bg="secondary" pill className="ms-2">
                                {group.balls.length} {group.balls.length === 1 ? "ball" : "balls"}
                            </Badge>
                            <div className="flex-grow-1 ms-3 border-bottom border-light" />
                        </div>

                        {/* Ball cards */}
                        <div className="d-flex flex-column gap-2">
                            {group.balls.map(({ ball, index }) => {
                                const isLastOver = group.over === maxOver;
                                const ballNum = ball.overCount.ball;

                                return (
                                    <Card key={index} className="shadow-sm border-0">
                                        <Card.Body className="py-2 px-3">
                                            <div className="d-flex align-items-center gap-2">
                                                {/* Ball number */}
                                                <div
                                                    className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary fw-bold flex-shrink-0"
                                                    style={{ width: 28, height: 28, fontSize: "0.8rem" }}
                                                >
                                                    {ballNum}
                                                </div>

                                                {/* Ball data */}
                                                <div className="flex-grow-1 d-flex flex-wrap align-items-center gap-1" style={{ fontSize: "0.85rem" }}>
                                                    <Badge bg="light" text="dark" className="fw-normal border">
                                                        {shortBowlerLabel(ball.bowlerType)}
                                                    </Badge>
                                                    {ball.wkPosition && (
                                                        <Badge bg="info" className="fw-normal">
                                                            WK: {ball.wkPosition}
                                                        </Badge>
                                                    )}
                                                    <Badge bg="light" text="dark" className="fw-normal border">
                                                        {shortDeliveryLabel(ball.deliveryPosition)}
                                                    </Badge>
                                                    <Badge bg={takeResultColor(ball.takeResult)} className="fw-normal">
                                                        {ball.takeResult}
                                                    </Badge>
                                                    {ball.collectionDifficulty && (
                                                        <Badge
                                                            bg={ball.collectionDifficulty === "Difficult" ? "info" : "light"}
                                                            text={ball.collectionDifficulty === "Difficult" ? "white" : "dark"}
                                                            className={`fw-normal ${ball.collectionDifficulty !== "Difficult" ? "border" : ""}`}
                                                        >
                                                            {ball.collectionDifficulty}
                                                        </Badge>
                                                    )}
                                                    {ball.errorReason && (
                                                        <Badge bg="warning" text="dark" className="fw-normal">
                                                            {ball.errorReason}
                                                        </Badge>
                                                    )}
                                                    {ball.throwInResult && ball.throwInResult !== (SHEET_EMPTY_VALUE as any) && (
                                                        <Badge bg="light" text="dark" className="fw-normal border">
                                                            TI: {ball.throwInResult}
                                                        </Badge>
                                                    )}
                                                    {ball.extraType && (
                                                        <Badge bg="danger" className="fw-normal">
                                                            {ball.extraType}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Action buttons */}
                                                <div className="d-flex gap-1 flex-shrink-0">
                                                    <Button
                                                        variant="link"
                                                        className="text-primary p-0"
                                                        onClick={() => openEdit(index)}
                                                        title="Edit"
                                                    >
                                                        <PencilSquare size={16} />
                                                    </Button>
                                                    {isLastOver && (
                                                        <Button
                                                            variant="link"
                                                            className="text-danger p-0"
                                                            onClick={() => setDeleteIndex(index)}
                                                            title="Delete"
                                                        >
                                                            <Trash size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            <Modal show={editIndex !== null} onHide={() => { setEditIndex(null); setEditBall(null); }} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-6">
                        Edit Ball {editBall ? `${editBall.overCount.over + 1}.${editBall.overCount.ball}` : ""}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editBall && (
                        <div className="d-flex flex-column gap-3">
                            <Form.Group>
                                <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Bowler</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={editBall.bowlerType}
                                    onChange={(e) => setEditBall({ ...editBall, bowlerType: e.target.value as BowlerType })}
                                >
                                    {bowlerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Keeper Position</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={editBall.wkPosition || ""}
                                    onChange={(e) => setEditBall({ ...editBall, wkPosition: (e.target.value || undefined) as WkPosition | undefined })}
                                >
                                    <option value="">-</option>
                                    {wkPositions.map((position) => <option key={position} value={position}>{position}</option>)}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Delivery</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={editBall.deliveryPosition || ""}
                                    onChange={(e) => setEditBall({ ...editBall, deliveryPosition: (e.target.value || undefined) as DeliveryPosition | undefined })}
                                >
                                    <option value="">-</option>
                                    {deliveryPositions.map((p) => <option key={p} value={p}>{p}</option>)}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Take</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={editBall.takeResult}
                                    onChange={(e) => {
                                        const newResult = e.target.value as TakeResult;
                                        const updates: Partial<BallEntry> = { takeResult: newResult };
                                        // Clear inapplicable fields when switching between result types
                                        if (showsCollection(newResult)) {
                                            updates.errorReason = undefined;
                                            if (!editBall.collectionDifficulty) updates.collectionDifficulty = "Regulation";
                                        } else if (showsError(newResult)) {
                                            updates.collectionDifficulty = undefined;
                                        } else {
                                            updates.collectionDifficulty = undefined;
                                            updates.errorReason = undefined;
                                        }
                                        setEditBall({ ...editBall, ...updates });
                                    }}
                                >
                                    {takeResults.map((r) => <option key={r} value={r}>{r}</option>)}
                                </Form.Select>
                            </Form.Group>

                            {showsCollection(editBall.takeResult) && (
                                <Form.Group>
                                    <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Collection Difficulty</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={editBall.collectionDifficulty || ""}
                                        onChange={(e) => setEditBall({ ...editBall, collectionDifficulty: (e.target.value || undefined) as CollectionDifficulty | undefined })}
                                    >
                                        <option value="">-</option>
                                        {collectionDifficulties.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            )}

                            {showsError(editBall.takeResult) && (
                                <Form.Group>
                                    <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Error Reason</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={editBall.errorReason || ""}
                                        onChange={(e) => setEditBall({ ...editBall, errorReason: (e.target.value || undefined) as ErrorReason | undefined })}
                                    >
                                        <option value="">-</option>
                                        {errorReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            )}

                            <Form.Group>
                                <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Throw In</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={editBall.throwInResult || ""}
                                    onChange={(e) => setEditBall({ ...editBall, throwInResult: (e.target.value || undefined) as ThrowInResult | undefined })}
                                >
                                    <option value="">-</option>
                                    {throwInResults.map((r) => <option key={r} value={r}>{r}</option>)}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="small text-muted fw-bold text-uppercase mb-1">Extra</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={editBall.extraType || ""}
                                    onChange={(e) => setEditBall({ ...editBall, extraType: (e.target.value || undefined) as ExtraType | undefined })}
                                >
                                    <option value="">None</option>
                                    {extraTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" size="sm" onClick={() => { setEditIndex(null); setEditBall(null); }}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={deleteIndex !== null} onHide={() => setDeleteIndex(null)} centered size="sm">
                <Modal.Header closeButton>
                    <Modal.Title className="fs-6">Delete Ball</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteIndex !== null && balls[deleteIndex] && (
                        <p className="mb-0">
                            Delete ball {balls[deleteIndex].overCount.over + 1}.{balls[deleteIndex].overCount.ball} ({balls[deleteIndex].takeResult})?
                            This cannot be undone.
                        </p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" size="sm" onClick={() => setDeleteIndex(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default BallsTab;
