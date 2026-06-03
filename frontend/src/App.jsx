import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import {
  BarChart3,
  Building2,
  Contact,
  DollarSign,
  Edit3,
  Globe2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from 'lucide-react';
import { api } from './api.js';
import { getHostedLogoutUrl } from './config.js';

const emptyCustomer = { name: '', industry: '', website: '', notes: '' };
const emptyContact = { customer_id: '', first_name: '', last_name: '', email: '', phone: '', title: '' };
const emptyDeal = { customer_id: '', name: '', amount: 0, stage: 'prospecting', close_date: '', notes: '' };
const stages = ['prospecting', 'qualified', 'proposal', 'won', 'lost'];
const locales = ['zh', 'en'];

const stageLabels = {
  zh: {
    prospecting: '初步沟通',
    qualified: '已确认',
    proposal: '方案报价',
    won: '已赢单',
    lost: '已丢单'
  },
  en: {
    prospecting: 'Prospecting',
    qualified: 'Qualified',
    proposal: 'Proposal',
    won: 'Won',
    lost: 'Lost'
  }
};

const translations = {
  zh: {
    appName: 'Easy CRM',
    appDescriptor: '销售运营工作台',
    loginTitle: '销售客户工作台',
    loginSubtitle: '使用 Cognito 账号登录，集中管理客户、联系人和销售机会。',
    signIn: '登录',
    loadingSession: '正在加载会话...',
    setupTitle: '配置缺失',
    setupCopy: '本地开发请设置 VITE_COGNITO_*，或通过 CDK 部署生成 /config.js。',
    dashboard: '概览',
    customers: '客户',
    contacts: '联系人',
    deals: '商机',
    refresh: '刷新数据',
    signOut: '退出登录',
    language: '语言',
    customerAction: '新建客户',
    summaryCustomers: '客户',
    summaryContacts: '联系人',
    summaryDeals: '商机',
    summaryPipeline: '管道金额',
    summaryCustomersHint: '当前客户池',
    summaryContactsHint: '关键联系人',
    summaryDealsHint: '销售机会数',
    summaryPipelineHint: '全部商机合计',
    recentCustomers: '最近客户',
    openDeals: '进行中商机',
    noRecentCustomers: '暂无客户记录',
    noOpenDeals: '暂无进行中的商机',
    name: '名称',
    industry: '行业',
    website: '网站',
    notes: '备注',
    customer: '客户',
    firstName: '名',
    lastName: '姓',
    email: '邮箱',
    phone: '电话',
    title: '职位',
    dealName: '商机名称',
    amount: '金额',
    stage: '阶段',
    closeDate: '预计关闭日',
    createCustomer: '创建客户',
    saveCustomer: '保存客户',
    createContact: '创建联系人',
    saveContact: '保存联系人',
    createDeal: '创建商机',
    saveDeal: '保存商机',
    cancel: '取消',
    editCustomer: '编辑客户',
    deleteCustomer: '删除客户',
    editContact: '编辑联系人',
    deleteContact: '删除联系人',
    editDeal: '编辑商机',
    deleteDeal: '删除商机',
    customerFormTitle: '客户资料',
    contactFormTitle: '联系人资料',
    dealFormTitle: '商机资料',
    editing: '编辑中',
    creating: '新建',
    searchCustomers: '搜索客户',
    recordCount: '条记录',
    allStages: '全部阶段',
    selectCustomer: '选择客户',
    noCustomers: '暂无客户。创建一个客户后会显示在这里。',
    noContacts: '暂无联系人。为客户添加联系人后会显示在这里。',
    noDeals: '暂无商机。创建商机后会显示在这里。',
    unknown: '未填写',
    tableActions: '操作',
    loadingData: '正在同步数据...'
  },
  en: {
    appName: 'Easy CRM',
    appDescriptor: 'Sales operations workspace',
    loginTitle: 'Sales workspace',
    loginSubtitle: 'Sign in with your Cognito account to manage customers, contacts and deals.',
    signIn: 'Sign in',
    loadingSession: 'Loading session...',
    setupTitle: 'Configuration missing',
    setupCopy: 'Set the VITE_COGNITO_* values for local development or deploy with CDK to generate /config.js.',
    dashboard: 'Dashboard',
    customers: 'Customers',
    contacts: 'Contacts',
    deals: 'Deals',
    refresh: 'Refresh data',
    signOut: 'Sign out',
    language: 'Language',
    customerAction: 'New customer',
    summaryCustomers: 'Customers',
    summaryContacts: 'Contacts',
    summaryDeals: 'Deals',
    summaryPipeline: 'Pipeline',
    summaryCustomersHint: 'Active accounts',
    summaryContactsHint: 'People in network',
    summaryDealsHint: 'Opportunities',
    summaryPipelineHint: 'Total deal value',
    recentCustomers: 'Recent customers',
    openDeals: 'Open deals',
    noRecentCustomers: 'No customer records yet',
    noOpenDeals: 'No open deals right now',
    name: 'Name',
    industry: 'Industry',
    website: 'Website',
    notes: 'Notes',
    customer: 'Customer',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    title: 'Title',
    dealName: 'Deal name',
    amount: 'Amount',
    stage: 'Stage',
    closeDate: 'Close date',
    createCustomer: 'Create customer',
    saveCustomer: 'Save customer',
    createContact: 'Create contact',
    saveContact: 'Save contact',
    createDeal: 'Create deal',
    saveDeal: 'Save deal',
    cancel: 'Cancel',
    editCustomer: 'Edit customer',
    deleteCustomer: 'Delete customer',
    editContact: 'Edit contact',
    deleteContact: 'Delete contact',
    editDeal: 'Edit deal',
    deleteDeal: 'Delete deal',
    customerFormTitle: 'Customer profile',
    contactFormTitle: 'Contact profile',
    dealFormTitle: 'Deal profile',
    editing: 'Editing',
    creating: 'Creating',
    searchCustomers: 'Search customers',
    recordCount: 'records',
    allStages: 'All stages',
    selectCustomer: 'Select customer',
    noCustomers: 'No customers yet. Create a customer to see it here.',
    noContacts: 'No contacts yet. Add a customer contact to see it here.',
    noDeals: 'No deals yet. Create a deal to see it here.',
    unknown: 'Not set',
    tableActions: 'Actions',
    loadingData: 'Syncing data...'
  }
};

function getInitialLocale() {
  const storedLocale = window.localStorage.getItem('easy-crm-locale');
  return locales.includes(storedLocale) ? storedLocale : 'zh';
}

function useLocaleText(locale) {
  return useCallback((key) => translations[locale]?.[key] || translations.en[key] || key, [locale]);
}

function formatCurrency(value, locale) {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function displayStage(stage, locale) {
  return stageLabels[locale]?.[stage] || stageLabels.en[stage] || stage;
}

function LoginScreen({ auth, t }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-mark"><Building2 size={28} /></div>
        <div>
          <p className="eyebrow">{t('appName')}</p>
          <h1>{t('loginTitle')}</h1>
          <p className="muted">{t('loginSubtitle')}</p>
        </div>
        <button className="primary-action wide-action" onClick={() => auth.signinRedirect()}>{t('signIn')}</button>
        {auth.error ? <p className="error-text">{auth.error.message}</p> : null}
      </section>
    </main>
  );
}

function LocaleSwitch({ locale, setLocale, t }) {
  return (
    <div className="locale-switch" aria-label={t('language')}>
      <Globe2 size={16} />
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          className={locale === item ? 'active' : ''}
          aria-label={`${t('language')}: ${item === 'zh' ? '中文' : 'English'}`}
          onClick={() => setLocale(item)}
        >
          {item === 'zh' ? '中文' : 'EN'}
        </button>
      ))}
    </div>
  );
}

function Shell({ children, activeTab, setActiveTab, onRefresh, auth, locale, setLocale, t }) {
  const tabs = [
    ['dashboard', BarChart3, t('dashboard')],
    ['customers', Building2, t('customers')],
    ['contacts', Contact, t('contacts')],
    ['deals', DollarSign, t('deals')]
  ];

  async function signOut() {
    await auth.removeUser();
    window.location.assign(getHostedLogoutUrl());
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><Building2 size={22} /></span>
          <span>
            <strong>{t('appName')}</strong>
            <small>{t('appDescriptor')}</small>
          </span>
        </div>
        <nav aria-label="Primary">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} className={activeTab === id ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <LocaleSwitch locale={locale} setLocale={setLocale} t={t} />
          <button className="icon-text-button" onClick={onRefresh}><RefreshCw size={16} />{t('refresh')}</button>
          <button className="icon-text-button" onClick={signOut}><LogOut size={16} />{t('signOut')}</button>
        </div>
      </aside>
      <main className="content">
        {children}
      </main>
    </div>
  );
}

function StatGrid({ summary, locale, t }) {
  const stats = [
    ['summaryCustomers', 'summaryCustomersHint', summary.customer_count || 0],
    ['summaryContacts', 'summaryContactsHint', summary.contact_count || 0],
    ['summaryDeals', 'summaryDealsHint', summary.deal_count || 0],
    ['summaryPipeline', 'summaryPipelineHint', formatCurrency(summary.deal_amount_total, locale)]
  ];
  return (
    <div className="stat-grid">
      {stats.map(([label, hint, value]) => (
        <div className="stat-card" key={label}>
          <span>{t(label)}</span>
          <strong>{value}</strong>
          <small>{t(hint)}</small>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function FormTitle({ title, editing, t }) {
  return (
    <div className="form-title">
      <h3>{title}</h3>
      <span>{editing ? t('editing') : t('creating')}</span>
    </div>
  );
}

function EmptyRow({ message, colSpan }) {
  return (
    <tr>
      <td className="empty-row" colSpan={colSpan}>{message}</td>
    </tr>
  );
}

function PlaceholderDash({ message }) {
  return <div className="empty-panel">{message}</div>;
}

function CustomerForm({ value, onChange, onSubmit, onCancel, editing, t }) {
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <FormTitle title={t('customerFormTitle')} editing={editing} t={t} />
      <Field label={t('name')} value={value.name} onChange={(name) => onChange({ ...value, name })} />
      <Field label={t('industry')} value={value.industry} onChange={(industry) => onChange({ ...value, industry })} />
      <Field label={t('website')} value={value.website} onChange={(website) => onChange({ ...value, website })} />
      <Field label={t('notes')} value={value.notes} onChange={(notes) => onChange({ ...value, notes })}>
        <textarea value={value.notes || ''} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </Field>
      <div className="form-actions">
        <button className="primary-action" type="submit">{editing ? t('saveCustomer') : t('createCustomer')}</button>
        <button className="secondary-action" type="button" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

function CustomersView({ token, customers, reload, t }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [error, setError] = useState('');

  async function loadSearch(event) {
    event.preventDefault();
    await reload({ search });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.updateCustomer(token, editing, form);
      } else {
        await api.createCustomer(token, form);
      }
      setEditing(null);
      setForm(emptyCustomer);
      await reload({ search });
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(customer) {
    setEditing(customer.id);
    setForm({
      name: customer.name || '',
      industry: customer.industry || '',
      website: customer.website || '',
      notes: customer.notes || ''
    });
  }

  async function remove(id) {
    await api.deleteCustomer(token, id);
    await reload({ search });
  }

  return (
    <section>
      <SectionHeader
        title={t('customers')}
        action={
          <form className="search-box" onSubmit={loadSearch}>
            <Search size={16} />
            <input placeholder={t('searchCustomers')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </form>
        }
      />
      <div className="split-layout">
        <CustomerForm value={form} onChange={setForm} onSubmit={submit} onCancel={() => { setEditing(null); setForm(emptyCustomer); }} editing={Boolean(editing)} t={t} />
        <div className="table-panel">
          {error ? <p className="error-text">{error}</p> : null}
          <table>
            <thead><tr><th>{t('name')}</th><th>{t('industry')}</th><th>{t('website')}</th><th>{t('tableActions')}</th></tr></thead>
            <tbody>
              {customers.length === 0 ? <EmptyRow message={t('noCustomers')} colSpan={4} /> : null}
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.industry || t('unknown')}</td>
                  <td>{customer.website || t('unknown')}</td>
                  <td className="row-actions">
                    <button aria-label={t('editCustomer')} title={t('editCustomer')} onClick={() => edit(customer)}><Edit3 size={15} /></button>
                    <button aria-label={t('deleteCustomer')} title={t('deleteCustomer')} onClick={() => remove(customer.id)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ContactForm({ customers, value, onChange, onSubmit, onCancel, editing, t }) {
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <FormTitle title={t('contactFormTitle')} editing={editing} t={t} />
      <Field label={t('customer')}>
        <select value={value.customer_id} onChange={(event) => onChange({ ...value, customer_id: event.target.value })}>
          <option value="">{t('selectCustomer')}</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label={t('firstName')} value={value.first_name} onChange={(first_name) => onChange({ ...value, first_name })} />
      <Field label={t('lastName')} value={value.last_name} onChange={(last_name) => onChange({ ...value, last_name })} />
      <Field label={t('email')} value={value.email} onChange={(email) => onChange({ ...value, email })} />
      <Field label={t('phone')} value={value.phone} onChange={(phone) => onChange({ ...value, phone })} />
      <Field label={t('title')} value={value.title} onChange={(title) => onChange({ ...value, title })} />
      <div className="form-actions">
        <button className="primary-action" type="submit">{editing ? t('saveContact') : t('createContact')}</button>
        <button className="secondary-action" type="button" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

function ContactsView({ token, customers, contacts, reload, t }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyContact);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.updateContact(token, editing, form);
      } else {
        await api.createContact(token, form);
      }
      setEditing(null);
      setForm(emptyContact);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(contact) {
    setEditing(contact.id);
    setForm({
      customer_id: contact.customer_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || ''
    });
  }

  async function remove(id) {
    await api.deleteContact(token, id);
    await reload();
  }

  return (
    <section>
      <SectionHeader title={t('contacts')} action={<span className="count-pill">{contacts.length} {t('recordCount')}</span>} />
      <div className="split-layout">
        <ContactForm customers={customers} value={form} onChange={setForm} onSubmit={submit} onCancel={() => { setEditing(null); setForm(emptyContact); }} editing={Boolean(editing)} t={t} />
        <div className="table-panel">
          {error ? <p className="error-text">{error}</p> : null}
          <table>
            <thead><tr><th>{t('name')}</th><th>{t('customer')}</th><th>{t('email')}</th><th>{t('phone')}</th><th>{t('tableActions')}</th></tr></thead>
            <tbody>
              {contacts.length === 0 ? <EmptyRow message={t('noContacts')} colSpan={5} /> : null}
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.first_name} {contact.last_name}</td>
                  <td>{contact.customer_name || t('unknown')}</td>
                  <td>{contact.email || t('unknown')}</td>
                  <td>{contact.phone || t('unknown')}</td>
                  <td className="row-actions">
                    <button aria-label={t('editContact')} title={t('editContact')} onClick={() => edit(contact)}><Edit3 size={15} /></button>
                    <button aria-label={t('deleteContact')} title={t('deleteContact')} onClick={() => remove(contact.id)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DealForm({ customers, value, onChange, onSubmit, onCancel, editing, locale, t }) {
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <FormTitle title={t('dealFormTitle')} editing={editing} t={t} />
      <Field label={t('customer')}>
        <select value={value.customer_id} onChange={(event) => onChange({ ...value, customer_id: event.target.value })}>
          <option value="">{t('selectCustomer')}</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label={t('dealName')} value={value.name} onChange={(name) => onChange({ ...value, name })} />
      <Field label={t('amount')} type="number" value={value.amount} onChange={(amount) => onChange({ ...value, amount })} />
      <Field label={t('stage')}>
        <select value={value.stage} onChange={(event) => onChange({ ...value, stage: event.target.value })}>
          {stages.map((stage) => <option key={stage} value={stage}>{displayStage(stage, locale)}</option>)}
        </select>
      </Field>
      <Field label={t('closeDate')} type="date" value={value.close_date} onChange={(close_date) => onChange({ ...value, close_date })} />
      <Field label={t('notes')} value={value.notes} onChange={(notes) => onChange({ ...value, notes })}>
        <textarea value={value.notes || ''} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </Field>
      <div className="form-actions">
        <button className="primary-action" type="submit">{editing ? t('saveDeal') : t('createDeal')}</button>
        <button className="secondary-action" type="button" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

function DealsView({ token, customers, deals, reload, locale, t }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyDeal);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.updateDeal(token, editing, form);
      } else {
        await api.createDeal(token, form);
      }
      setEditing(null);
      setForm(emptyDeal);
      await reload({ dealFilters: { stage } });
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(deal) {
    setEditing(deal.id);
    setForm({
      customer_id: deal.customer_id,
      name: deal.name,
      amount: deal.amount,
      stage: deal.stage,
      close_date: deal.close_date || '',
      notes: deal.notes || ''
    });
  }

  async function remove(id) {
    await api.deleteDeal(token, id);
    await reload({ dealFilters: { stage } });
  }

  return (
    <section>
      <SectionHeader
        title={t('deals')}
        action={
          <select className="stage-filter" value={stage} onChange={async (event) => { setStage(event.target.value); await reload({ dealFilters: { stage: event.target.value } }); }}>
            <option value="">{t('allStages')}</option>
            {stages.map((item) => <option key={item} value={item}>{displayStage(item, locale)}</option>)}
          </select>
        }
      />
      <div className="split-layout">
        <DealForm customers={customers} value={form} onChange={setForm} onSubmit={submit} onCancel={() => { setEditing(null); setForm(emptyDeal); }} editing={Boolean(editing)} locale={locale} t={t} />
        <div className="table-panel">
          {error ? <p className="error-text">{error}</p> : null}
          <table>
            <thead><tr><th>{t('name')}</th><th>{t('customer')}</th><th>{t('stage')}</th><th>{t('amount')}</th><th>{t('tableActions')}</th></tr></thead>
            <tbody>
              {deals.length === 0 ? <EmptyRow message={t('noDeals')} colSpan={5} /> : null}
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.name}</td>
                  <td>{deal.customer_name || t('unknown')}</td>
                  <td><span className={`stage-pill stage-${deal.stage}`}>{displayStage(deal.stage, locale)}</span></td>
                  <td>{formatCurrency(deal.amount, locale)}</td>
                  <td className="row-actions">
                    <button aria-label={t('editDeal')} title={t('editDeal')} onClick={() => edit(deal)}><Edit3 size={15} /></button>
                    <button aria-label={t('deleteDeal')} title={t('deleteDeal')} onClick={() => remove(deal.id)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Dashboard({ summary, customers, deals, locale, setActiveTab, t }) {
  const openDeals = deals.filter((deal) => !['won', 'lost'].includes(deal.stage)).slice(0, 6);

  return (
    <section>
      <SectionHeader
        title={t('dashboard')}
        subtitle={t('appDescriptor')}
        action={<button className="primary-action compact" onClick={() => setActiveTab('customers')}><Plus size={16} />{t('customerAction')}</button>}
      />
      <StatGrid summary={summary} locale={locale} t={t} />
      <div className="dashboard-grid">
        <div className="table-panel">
          <h3>{t('recentCustomers')}</h3>
          {customers.length === 0 ? <PlaceholderDash message={t('noRecentCustomers')} /> : (
            <table>
              <tbody>{customers.slice(0, 6).map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.industry || t('unknown')}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="table-panel">
          <h3>{t('openDeals')}</h3>
          {openDeals.length === 0 ? <PlaceholderDash message={t('noOpenDeals')} /> : (
            <table>
              <tbody>{openDeals.map((deal) => <tr key={deal.id}><td>{deal.name}</td><td><span className={`stage-pill stage-${deal.stage}`}>{displayStage(deal.stage, locale)}</span></td><td>{formatCurrency(deal.amount, locale)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const auth = useAuth();
  const [locale, setLocaleState] = useState(getInitialLocale);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState({});
  const [customers, setCustomers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = useLocaleText(locale);
  const token = auth.user?.access_token;
  const customerOptions = useMemo(() => customers, [customers]);

  const setLocale = useCallback((nextLocale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem('easy-crm-locale', nextLocale);
  }, []);

  const reload = useCallback(async (options = {}) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [nextSummary, nextCustomers, nextContacts, nextDeals] = await Promise.all([
        api.dashboard(token),
        api.listCustomers(token, options.search || ''),
        api.listContacts(token),
        api.listDeals(token, options.dealFilters || {})
      ]);
      setSummary(nextSummary);
      setCustomers(nextCustomers.items);
      setContacts(nextContacts.items);
      setDeals(nextDeals.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (auth.isLoading) {
    return (
      <main className="setup-screen">
        <section className="setup-panel status-panel">{t('loadingSession')}</section>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return <LoginScreen auth={auth} t={t} />;
  }

  return (
    <Shell activeTab={activeTab} setActiveTab={setActiveTab} onRefresh={() => reload()} auth={auth} locale={locale} setLocale={setLocale} t={t}>
      {error ? <div className="alert">{error}</div> : null}
      {loading ? <div className="loading-bar">{t('loadingData')}</div> : null}
      {activeTab === 'dashboard' ? <Dashboard summary={summary} customers={customers} deals={deals} locale={locale} setActiveTab={setActiveTab} t={t} /> : null}
      {activeTab === 'customers' ? <CustomersView token={token} customers={customers} reload={reload} t={t} /> : null}
      {activeTab === 'contacts' ? <ContactsView token={token} customers={customerOptions} contacts={contacts} reload={reload} t={t} /> : null}
      {activeTab === 'deals' ? <DealsView token={token} customers={customerOptions} deals={deals} reload={reload} locale={locale} t={t} /> : null}
    </Shell>
  );
}
