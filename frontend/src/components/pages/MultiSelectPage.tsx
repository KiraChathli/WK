import {
  bowlerTypes,
  collectionDifficulties,
  deliveryPositions,
  errorReasons,
  takeResults,
  throwInResults,
  wkPositions,
  type PageType,
} from "../../../../common/types";
import BowlerTypeBuilder from "../common/BowlerTypeBuilder";
import DeliveryPositionMultiSelect from "../common/DeliveryPositionMultiSelect";
import MultiSelect from "../common/MultiSelect";

type Props = {
  pageType: PageType;
  selectedValue: string;
  onChange: (value: string) => void;
};

type PageConfig = {
  title: string;
  options: readonly string[];
};

const pageConfig: { [key in PageType]: PageConfig } = {
  bowler: {
    title: "Bowler Type",
    options: bowlerTypes,
  },
  keeper: {
    title: "Keeper Position",
    options: wkPositions,
  },
  delivery: {
    title: "Delivery Location",
    options: deliveryPositions,
  },
  take: {
    title: "Take Result",
    options: takeResults,
  },
  collection: {
    title: "Collection Difficulty",
    options: collectionDifficulties,
  },
  error: {
    title: "Error Reason",
    options: errorReasons,
  },
  throwIn: {
    title: "Throw In Result",
    options: throwInResults,
  },
};

const MultiSelectPage = ({ pageType, selectedValue, onChange }: Props) => {
  const config = pageConfig[pageType];

  // Regular button layout for other pages
  return (
    <section className="multiselect-page rounded-3 shadow-sm bg-body p-3">
      <header className="mb-3">
        <p className="eyebrow text-uppercase fw-semibold  mb-1 small">
          {config.title}
        </p>
      </header>

      {pageType === "delivery" ? (
        <DeliveryPositionMultiSelect
          selectedValue={selectedValue}
          onChange={onChange}
        />
      ) : pageType === "bowler" ? (
        <BowlerTypeBuilder selectedValue={selectedValue} onChange={onChange} />
      ) : (
        <MultiSelect
          options={config.options}
          selectedValue={selectedValue}
          onChange={onChange}
        />
      )}
    </section>
  );
};

export default MultiSelectPage;
