import api from '../api/axios';
import useFetch from '../hooks/useFetch';
import Loader from '../components/ui/Loader';
import WeeklyGrid from '../components/timetable/WeeklyGrid';

export default function Timetable() {
  const { data: week, loading, error } = useFetch(() => api.get('/timetable').then((r) => r.data.week), []);

  return (
    <>
      <h1>Weekly timetable</h1>
      <p className="muted">Sessions from the courses you are enrolled in (or teach).</p>
      {loading ? <Loader /> : error ? <p className="error">{error}</p> : <WeeklyGrid week={week} />}
    </>
  );
}