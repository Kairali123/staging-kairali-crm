// import React from 'react';
// import styles from './Loader.module.css';

// interface LoaderProps {
//   isLoading?: boolean;
// }

// const Loader: React.FC<LoaderProps> = ({ isLoading = false }) => {
//   if (!isLoading) return null;

//   return (
//     <div className={styles.loaderWrapper}>
//       <div className={styles.loader}>
//         <div className={styles.spinner}></div>
//         <img 
//           src="https://www.kairali.com/KTAHV_PI_GoogleScript/images/grouploader.gif" 
//           alt="loading..." 
//         />
//       </div>
//     </div>
//   );
// };

// export default Loader;


import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  isLoading?: boolean;
  contentOnly?: boolean; // true = covers only main content area
}

const Loader: React.FC<LoaderProps> = ({ isLoading = false, contentOnly = false }) => {
  if (!isLoading) return null;

  return (
    <div className={contentOnly ? styles.loaderWrapperContent : styles.loaderWrapper}>
      <div className={styles.loader}>
        <div className={styles.spinner}></div>
        <img 
          src="https://www.kairali.com/KTAHV_PI_GoogleScript/images/grouploader.gif" 
          alt="loading..." 
        />
      </div>
    </div>
  );
};

export default Loader;
