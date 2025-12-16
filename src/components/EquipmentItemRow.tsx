import type { EquipmentItem } from '../types';
import { useDatabase } from '../contexts/DatabaseContext';
import './EquipmentItemRow.css';

interface EquipmentItemRowProps {
  item: EquipmentItem;
  onClick: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
  onOpenSubItems?: (item: EquipmentItem) => void;
  isCompact?: boolean;
}

// ... (קבועי statusMap נשארים זהים)
const statusMap = {
  'available': { text: 'כשיר', class: 'status-available' },
  'charging': { text: 'בטעינה', class: 'status-charging' },
  'broken': { text: 'לא כשיר', class: 'status-broken' },
  'repair': { text: 'בתיקון', class: 'status-repair' },
  'loaned': { text: 'בפעילות', class: 'status-loaned' }
};

const EquipmentItemRow: React.FC<EquipmentItemRowProps> = ({ item, onClick, isSelectable, isSelected, onToggle, onOpenSubItems, isCompact }) => { // 2. קיבלנו את onClick
  const { users } = useDatabase();

  const manager = users.find(u => u.uid === item.managerUserId);
  const loanedToUser = users.find(u => u.uid === item.loanedToUserId);

  const checkDate = new Date(item.lastCheckDate).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  });

  let secondaryInfo = `אחראי: ${manager?.displayName || '...'} • ווידוא: ${checkDate}`;
  if (item.status === 'loaned') {
    secondaryInfo = `הושאל ל: ${loanedToUser?.displayName || '...'} • עד: 29/10/25`;
  }

  const statusInfo = statusMap[item.status] || { text: 'לא ידוע', class: 'status-grey' };

  return (
    // 3. הוספנו את onClick ל-div החיצוני
    <div className={`equipment-item-content ${isCompact ? 'compact' : ''}`} onClick={isSelectable ? undefined : onClick} style={{ display: 'flex', alignItems: 'center' }}>
      {isSelectable && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onToggle) onToggle();
          }}
          style={{ paddingLeft: '12px', cursor: 'pointer', display: 'flex' }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => { }} // handled by div onClick
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={isSelectable && onToggle ? onToggle : undefined}>
        <div className="equipment-details">
          <div className="equipment-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{item.name}</span>
            {item.quantity && item.quantity > 1 && (
              <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                (x{item.quantity})
              </span>
            )}
            {/* New Button for Sub-Items */}
            {item.subItems && item.subItems.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenSubItems) onOpenSubItems(item);
                }}
                style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #666',
                  background: 'transparent',
                  color: '#aaa',
                  marginRight: '8px',
                  cursor: 'pointer'
                }}
              >
                רשימת ציוד ({item.subItems.length})
              </button>
            )}
          </div>
          {!isCompact && (
            <div className="equipment-secondary-info" style={{ color: item.status === 'loaned' ? 'var(--status-orange)' : undefined }}>
              {secondaryInfo}
            </div>
          )}
        </div>
        <div className={`equipment-status ${statusInfo.class}`}>
          <span className="status-dot"></span>
          <span>{statusInfo.text}</span>
        </div>
      </div>
    </div>
  );
};

export default EquipmentItemRow;