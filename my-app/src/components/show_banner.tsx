import { useState, forwardRef, useImperativeHandle } from "react";

const Banner = forwardRef((props, ref) => {
  const [showBanner, setShowBanner] = useState(false);
  const [message, setMessage] = useState("");
  const [animate, setAnimate] = useState(false);

  const triggerBanner = (msg: string) => {
    setMessage(msg);
    setShowBanner(true);

    setTimeout(() => setAnimate(true), 10);

    setTimeout(() => {
      setAnimate(false);
      setTimeout(() => setShowBanner(false), 500); // wait for animation to finish
    }, 3000);
  };

  const {} = props;

  useImperativeHandle(ref, () => ({
    triggerBanner,
  }));

  return (
    <>
      {/* Pass triggerBanner to children */}
      {showBanner && (
        <div
          className={`fixed top-5 right-0 z-50 transform transition-all duration-500 ease-in-out
    ${animate ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0"}
    bg-[#e50914] text-white px-6 py-3 rounded-l-lg shadow-lg`}
          style={{ willChange: "transform, opacity" }}
        >
          {message}
        </div>
      )}
    </>
  );
});

export default Banner;
