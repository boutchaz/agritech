import React from 'react';
import SoilAnalysisPage from './SoilAnalysisPage';
import UtilitiesManagement from './UtilitiesManagement';
import DashboardHome from './DashboardHome';

interface ModuleRendererProps {
  activeModule: string;
}

const ModuleRenderer: React.FC<ModuleRendererProps> = ({ activeModule }) => {
  const renderModule = () => {
    switch (activeModule) {
      case 'soil-analysis':
        return <SoilAnalysisPage />;
      case 'utilities':
        return <UtilitiesManagement />;
      case 'dashboard':
      case 'home':
        return <DashboardHome />;
      // Add more modules as they're implemented
      // case 'fruit-trees':
      //   return <FruitTreesModule />;
      // case 'irrigation':
      //   return <IrrigationModule />;
      // case 'harvest':
      //   return <HarvestModule />;
      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Module en développement
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Le module "{activeModule}" sera bientôt disponible.
              </p>
            </div>
          </div>
        );
    }
  };

  return <div className="p-6">{renderModule()}</div>;
};

export default ModuleRenderer;