'use strict';
const search = document.getElementById('search');
if (search) {
  const rows = [...document.querySelectorAll('.staff-result')];
  function filterStaff() {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const row of rows) {
      row.hidden = !row.dataset.search.includes(query);
      if (!row.hidden) count++;
    }
    document.getElementById('matches').textContent = count
      ? `${count} ${count === 1 ? 'person' : 'people'}`
      : 'No matching staff.';
  }
  search.addEventListener('input', filterStaff);
  filterStaff();
}
