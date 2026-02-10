import SlimSelect from 'npm:slim-select@2.8.1';

export function createDomainSelector(domainsArray, defaultDomains) {
  const groupedDomains = domainsArray.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item.domain);
    return acc;
  }, {});

  const selectData = Object.entries(groupedDomains)
    .sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB))
    .map(([category, domains]) => ({
      label: category,
      options: domains.map((domain) => ({
        text: domain,
        value: domain,
      })),
    }));

  const select = document.createElement('select');
  select.setAttribute('id', 'slim-select');
  select.setAttribute('multiple', '');

  selectData.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;

    group.options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      if (defaultDomains.includes(option.value)) {
        optionElement.selected = true;
      }
      optgroup.appendChild(optionElement);
    });

    select.appendChild(optgroup);
  });

  setTimeout(() => {
    new SlimSelect({
      select: select,
      settings: {
        allowDeselect: false,
        closeOnSelect: false,
        placeholderText: 'Select up to 10 domains',
        minSelected: 1,
        maxSelected: 10,
      },
      events: {
        afterChange: (newVal) => {
          defaultDomains.splice(
            0,
            defaultDomains.length,
            ...newVal.map((obj) => obj.value),
          );
        },
      },
    });
  }, 0);

  return select;
}
