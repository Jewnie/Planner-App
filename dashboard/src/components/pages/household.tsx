import { useParams } from 'react-router-dom';

const HouseholdPage = () => {
  const { householdId } = useParams();
  return <div>{householdId}</div>;
};

export default HouseholdPage;
