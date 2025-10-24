import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const scheduleData = req.body;
    
    const filePath = path.join(process.cwd(), 'public', 'json', 'report-schedule.json');
    
    fs.writeFileSync(filePath, JSON.stringify(scheduleData, null, 2), 'utf8');
    
    return res.status(200).json({ message: 'Schedule saved successfully' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return res.status(500).json({ message: 'Error saving schedule', error: error.message });
  }
}