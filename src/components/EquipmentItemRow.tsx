import type { EquipmentItem } from '../types';
import { useDatabase } from '../contexts/DatabaseContext';
import './EquipmentItemRow.css';

interface EquipmentItemRowProps {
  item: EquipmentItem;
  onClick: () => void; // 1. הוספנו Prop חדש
}

// ... (קבועי statusMap נשארים זהים)
const statusMap = {
  'available': { text: 'כשיר', class: 'status-available' },
  'charging': { text: 'בטעינה', class: 'status-charging' },
  'broken': { text: 'לא כשיר', class: 'status-broken' },
  'repair': { text: 'בתיקון', class: 'status-repair' },
  'loaned': { text: 'הושאל', class: 'status-loaned' }
};

const EquipmentItemRow: React.FC<EquipmentItemRowProps> = ({ item, onClick }) => { // 2. קיבלנו את onClick
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
    <div className="equipment-item-content" onClick={onClick}> 
      <div className="equipment-details">
        <div className="equipment-name">{item.name}</div>
        <div className="equipment-secondary-info" style={{ color: item.status === 'loaned' ? 'var(--status-orange)' : undefined }}>
          {secondaryInfo}
        </div>
      </div>
      <div className={`equipment-status ${statusInfo.class}`}>
        <span className="status-dot"></span>
        <span>{statusInfo.text}</span>
      </div>
    </div>
  );
};

export default EquipmentItemRow;