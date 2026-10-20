export default function Loader({ full }) {
  return (
    <div className={full ? 'loader loader-full' : 'loader'}>
      <div className="spinner" />
    </div>
  );
}