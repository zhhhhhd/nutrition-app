if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/static/service-worker.js')
    .then(()=>console.log('Service Worker 注册成功'))
    .catch(console.error);
}
document.addEventListener('DOMContentLoaded', () => {
  let ingredients = [], LOOKUP = {}, nutrientKeys = [];

  // 四大关键指标及其对应的 slug、图标、标签
  const summaryKeys   = [
    '能量(千卡/100克)',
    '碳水化合物(克/100克)',
    '脂肪(克/100克)',
    '蛋白质(克/100克)'
  ];
  const summarySlugs  = ['energy','carbs','fat','protein'];
  const summaryIcons  = {
    '能量(千卡/100克)':       'fas fa-bolt text-warning',
    '碳水化合物(克/100克)':   'fas fa-bread-slice text-success',
    '脂肪(克/100克)':         'fas fa-tint text-danger',
    '蛋白质(克/100克)':       'fas fa-drumstick-bite text-primary'
  };
  const summaryLabels = {
    '能量(千卡/100克)':       '能量 (kcal)',
    '碳水化合物(克/100克)':   '碳水 (g)',
    '脂肪(克/100克)':         '脂肪 (g)',
    '蛋白质(克/100克)':       '蛋白 (g)'
  };

  // DOM 元素引用
  const dl           = document.getElementById('food-list');
  const tbIngBody    = document.querySelector('#tb-ingredients tbody');
  const sumContainer = document.getElementById('summary-metrics');
  const listL        = document.getElementById('nutrients-list-left');
  const listR        = document.getElementById('nutrients-list-right');
  const tbRecHead    = document.querySelector('#tb-recipes thead tr');
  const tbRecBody    = document.querySelector('#tb-recipes tbody');

  // 载入 nutrients.json
  fetch('/static/data/nutrients.json')
    .then(r => r.json())
    .then(data => {
      // 构建 LOOKUP 和补全列表
      data.forEach(item => {
        LOOKUP[item.name] = item.per100g;
        const opt = document.createElement('option');
        opt.value = item.name;
        dl.appendChild(opt);
      });
      // 营养素字段列表
      nutrientKeys = Object.keys(data[0].per100g);

      // 构建四大指标卡片
      summaryKeys.forEach((key, i) => {
        const slug = summarySlugs[i];
        const col = document.createElement('div');
        col.className = 'col-6 col-md-3';
        col.innerHTML = `
          <div class="card p-3">
            <i class="${summaryIcons[key]}"></i>
            <h6 class="mt-2">${summaryLabels[key]}</h6>
            <p id="sum-${slug}">–</p>
          </div>`;
        sumContainer.appendChild(col);
      });

      // 构建已保存菜谱表头（补充营养列）
      if (tbRecHead.children.length === 2) {
        nutrientKeys.forEach(k => {
          const th = document.createElement('th');
          th.textContent = k;
          tbRecHead.appendChild(th);
        });
      }

      // 初次加载已保存菜谱
      loadRecipes();
    });

  // “添加食材”按钮
  document.getElementById('btn-add').onclick = () => {
    const name = document.getElementById('food-name').value.trim();
    const wt   = parseFloat(document.getElementById('food-qty').value);
    if (!name || isNaN(wt) || wt <= 0 || !(name in LOOKUP)) {
      return alert('请从列表中选择有效食材并输入正整数重量');
    }
    ingredients.push({ name, weight: wt });
    renderIngredients();
    document.getElementById('food-name').value = '';
    document.getElementById('food-qty').value  = '';
  };

  // 渲染配料列表
  function renderIngredients() {
    tbIngBody.innerHTML = '';
    ingredients.forEach((ing, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ing.name}</td>
        <td>${ing.weight}</td>
        <td>
          <button class="btn btn-sm btn-danger" data-i="${i}">
            删除
          </button>
        </td>`;
      tbIngBody.appendChild(tr);
    });
    tbIngBody.querySelectorAll('button[data-i]').forEach(btn => {
      btn.onclick = () => {
        ingredients.splice(+btn.dataset.i, 1);
        renderIngredients();
      };
    });
  }

  // “计算总营养”按钮
  document.getElementById('btn-calc').onclick = () => {
    if (ingredients.length === 0) {
      return alert('请先添加食材');
    }
    fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(ingredients)
    })
    .then(r => r.json())
    .then(total => {
      // 更新四大指标
      summarySlugs.forEach((slug, i) => {
        const key = summaryKeys[i];
        document.getElementById(`sum-${slug}`).textContent = total[key];
      });
      // 更新更多营养素列表
      const others = nutrientKeys.filter(k => !summaryKeys.includes(k));
      const mid    = Math.ceil(others.length / 2);
      listL.innerHTML = ''; listR.innerHTML = '';
      others.slice(0, mid).forEach(k => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between';
        li.innerHTML = `<span>${k}</span><span>${total[k]}</span>`;
        listL.appendChild(li);
      });
      others.slice(mid).forEach(k => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between';
        li.innerHTML = `<span>${k}</span><span>${total[k]}</span>`;
        listR.appendChild(li);
      });
    });
  };

  // “保存菜谱”按钮
  document.getElementById('btn-save').onclick = () => {
    const dish = document.getElementById('dish-name').value.trim();
    if (!dish)         return alert('请填写菜名');
    if (ingredients.length === 0) return alert('请先添加食材');

    // 先计算再保存
    fetch('/api/calculate', {
      method: 'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(ingredients)
    })
    .then(r => r.json())
    .then(total => {
      const rec = { name: dish, ingredients, total };
      return fetch('/api/recipes', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(rec)
      });
    })
    .then(r => {
      if (r.ok) {
        document.getElementById('dish-name').value = '';
        ingredients = [];
        renderIngredients();
        loadRecipes();
        alert('保存成功');
      } else {
        throw '保存失败';
      }
    })
    .catch(e => alert(e));
  };

  // 加载并渲染已保存菜谱
  function loadRecipes() {
    fetch('/api/recipes')
      .then(r => r.json())
      .then(list => {
        tbRecBody.innerHTML = '';
        list.forEach(rec => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${rec.name}</td>
            <td>${rec.ingredients.map(i => `${i.name}(${i.weight}g)`).join('、')}</td>`;
          nutrientKeys.forEach(k => {
            const td = document.createElement('td');
            td.textContent = rec.total[k];
            tr.appendChild(td);
          });
          tbRecBody.appendChild(tr);
        });
      });
  }

});