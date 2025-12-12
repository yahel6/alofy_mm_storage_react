import { Link } from 'react-router-dom'; // 1. ייבוא Link
import { useDatabase } from '../contexts/DatabaseContext';
import HeaderNav from '../components/HeaderNav';

function WarehousesPage() {
  const { warehouses, equipment, isLoading } = useDatabase();

  if (isLoading) {
    return <div>טוען מחסנים...</div>;
  }

  const getEquipmentCount = (warehouseId: string) => {
    const items = equipment.filter(item => item.warehouseId === warehouseId);
    const available = items.filter(i => i.status === 'available').length;
    return {
      total: items.length,
      available: available,
    };
  };

  return (
    <div>
      <HeaderNav title="מחסנים" />
      <div className="container">
        {warehouses.length === 0 ? (
          <p>לא נמצאו מחסנים.</p>
        ) : (
          warehouses.map(warehouse => {
            const count = getEquipmentCount(warehouse.id);
            const statusClass = (count.total > 0 && (count.available / count.total) < 0.5)
              ? 'status-red'
              : 'status-green';

            return (
              // 2. עטיפה ב-Link במקום div
              <Link
                to={`/warehouses/${warehouse.id}`} // 3. הכתובת הדינאמית
                key={warehouse.id}
                className="warehouse-card"
                style={{ textDecoration: 'none' }} // ביטול קו תחתון
              >
                <div>
                  <h3 className="warehouse-card-title">{warehouse.name}</h3>
                  <div className={`warehouse-card-status ${statusClass}`}>
                    {count.available}/{count.total} פריטים כשירים
                  </div>
                </div>
                <span className="chevron">&#9664;</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export default WarehousesPage;