import { Form } from "react-bootstrap";
import type { MatchRangeOption } from "../../../../../common/types";

interface MatchRangeSelectorProps {
    value: MatchRangeOption;
    onChange: (range: MatchRangeOption) => void;
    totalMatches: number;
}

const MatchRangeSelector = ({ value, onChange, totalMatches }: MatchRangeSelectorProps) => (
    <Form.Group className="mb-3">
        <Form.Select
            value={value}
            onChange={(e) => {
                const val = e.target.value;
                onChange(val === "all" ? "all" : (Number(val) as MatchRangeOption));
            }}
            size="sm"
        >
            <option value={5}>Last 5 matches</option>
            <option value={10}>Last 10 matches</option>
            <option value={20}>Last 20 matches</option>
            <option value="all">All matches ({totalMatches})</option>
        </Form.Select>
    </Form.Group>
);

export default MatchRangeSelector;
