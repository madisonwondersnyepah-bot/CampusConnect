export default function Button({ variant = 'primary', size, type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''} ${className}`}
      {...props}
    />
  );
}