import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { BarChart3, Building2, Contact, DollarSign, Edit3, LogOut, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { api } from './api.js';
import { getHostedLogoutUrl } from './config.js';

const emptyCustomer = { name: '', industry: '', website: '', notes: '' };
const emptyContact = { customer_id: '', first_name: '', last_name: '', email: '', phone: '', title: '' };
const emptyDeal = { customer_id: '', name: '', amount: 0, stage: 'prospecting', close_date: '', notes: '' };
const stages = ['prospecting', 'qualified', 'proposal', 'won', 'lost'];

function LoginScreen({ auth }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Easy CRM</p>
          <h1>Sales workspace</h1>
          <p className="muted">Sign in with your Cognito account to manage customers, contacts and deals.</p>
        </div>
        <button className="primary-action" onClick={() => auth.signinRedirect()}>Sign in</button>
        {auth.error ? <p className="error-text">{auth.error.message}</p> : null}
      </section>
    </main>
  );
}

function Shell({ children, activeTab, setActiveTab, onRefresh, auth }) {
  const tabs = [
    ['dashboard', BarChart3, 'Dashboard'],
    ['customers', Building2, 'Customers'],
    ['contacts', Contact, 'Contacts'],
    ['deals', DollarSign, 'Deals']
  ];

  async function signOut() {
    await auth.removeUser();
    window.location.assign(getHostedLogoutUrl());
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Building2 size={24} />
          <span>Easy CRM</span>
        </div>
        <nav>
          {tabs.map(([id, Icon, label]) => (
            <button key={id} className={activeTab === id ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="icon-text-button" onClick={onRefresh}><RefreshCw size={16} />Refresh</button>
          <button className="icon-text-button" onClick={signOut}><LogOut size={16} />Sign out</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function StatGrid({ summary }) {
  const stats = [
    ['Customers', summary.customer_count || 0],
    ['Contacts', summary.contact_count || 0],
    ['Deals', summary.deal_count || 0],
    ['Pipeline', `$${Number(summary.deal_amount_total || 0).toLocaleString()}`]
  ];
  return (
    <div className="stat-grid">
      {stats.map(([label, value]) => (
        <div className="stat-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
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

function CustomerForm({ value, onChange, onSubmit, onCancel, editing }) {
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <Field label="Name" value={value.name} onChange={(name) => onChange({ ...value, name })} />
      <Field label="Industry" value={value.industry} onChange={(industry) => onChange({ ...value, industry })} />
      <Field label="Website" value={value.website} onChange={(website) => onChange({ ...value, website })} />
      <Field label="Notes" value={value.notes} onChange={(notes) => onChange({ ...value, notes })}>
        <textarea value={value.notes || ''} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </Field>
      <div className="form-actions">
        <button className="primary-action" type="submit">{editing ? 'Save customer' : 'Create customer'}</button>
        <button className="secondary-action" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function CustomersView({ token, customers, reload }) {
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
        title="Customers"
        action={
          <form className="search-box" onSubmit={loadSearch}>
            <Search size={16} />
            <input placeholder="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} />
          </form>
        }
      />
      <div className="split-layout">
        <CustomerForm value={form} onChange={setForm} onSubmit={submit} onCancel={() => { setEditing(null); setForm(emptyCustomer); }} editing={Boolean(editing)} />
        <div className="table-panel">
          {error ? <p className="error-text">{error}</p> : null}
          <table>
            <thead><tr><th>Name</th><th>Industry</th><th>Website</th><th></th></tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.industry || '-'}</td>
                  <td>{customer.website || '-'}</td>
                  <td className="row-actions">
                    <button title="Edit customer" onClick={() => edit(customer)}><Edit3 size={15} /></button>
                    <button title="Delete customer" onClick={() => remove(customer.id)}><Trash2 size={15} /></button>
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

function ContactForm({ customers, value, onChange, onSubmit, onCancel, editing }) {
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <Field label="Customer">
        <select value={value.customer_id} onChange={(event) => onChange({ ...value, customer_id: event.target.value })}>
          <option value="">Select customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label="First name" value={value.first_name} onChange={(first_name) => onChange({ ...value, first_name })} />
      <Field label="Last name" value={value.last_name} onChange={(last_name) => onChange({ ...value, last_name })} />
      <Field label="Email" value={value.email} onChange={(email) => onChange({ ...value, email })} />
      <Field label="Phone" value={value.phone} onChange={(phone) => onChange({ ...value, phone })} />
      <Field label="Title" value={value.title} onChange={(title) => onChange({ ...value, title })} />
      <div className="form-actions">
        <button className="primary-action" type="submit">{editing ? 'Save contact' : 'Create contact'}</button>
        <button className="secondary-action" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ContactsView({ token, customers, contacts, reload }) {
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
      <SectionHeader title="Contacts" action={<span className="count-pill">{contacts.length} records</span>} />
      <div className="split-layout">
        <ContactForm customers={customers} value={form} onChange={setForm} onSubmit={submit} onCancel={() => { setEditing(null); setForm(emptyContact); }} editing={Boolean(editing)} />
        <div className="table-panel">
          {error ? <p className="error-text">{error}</p> : null}
          <table>
            <thead><tr><th>Name</th><th>Customer</th><th>Email</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.first_name} {contact.last_name}</td>
                  <td>{contact.customer_name || '-'}</td>
                  <td>{contact.email || '-'}</td>
                  <td>{contact.phone || '-'}</td>
                  <td className="row-actions">
                    <button title="Edit contact" onClick={() => edit(contact)}><Edit3 size={15} /></button>
                    <button title="Delete contact" onClick={() => remove(contact.id)}><Trash2 size={15} /></button>
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

function DealForm({ customers, value, onChange, onSubmit, onCancel, editing }) {
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <Field label="Customer">
        <select value={value.customer_id} onChange={(event) => onChange({ ...value, customer_id: event.target.value })}>
          <option value="">Select customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label="Deal name" value={value.name} onChange={(name) => onChange({ ...value, name })} />
      <Field label="Amount" type="number" value={value.amount} onChange={(amount) => onChange({ ...value, amount })} />
      <Field label="Stage">
        <select value={value.stage} onChange={(event) => onChange({ ...value, stage: event.target.value })}>
          {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </select>
      </Field>
      <Field label="Close date" type="date" value={value.close_date} onChange={(close_date) => onChange({ ...value, close_date })} />
      <Field label="Notes" value={value.notes} onChange={(notes) => onChange({ ...value, notes })}>
        <textarea value={value.notes || ''} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </Field>
      <div className="form-actions">
        <button className="primary-action" type="submit">{editing ? 'Save deal' : 'Create deal'}</button>
        <button className="secondary-action" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function DealsView({ token, customers, deals, reload }) {
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
        title="Deals"
        action={
          <select className="stage-filter" value={stage} onChange={async (event) => { setStage(event.target.value); await reload({ dealFilters: { stage: event.target.value } }); }}>
            <option value="">All stages</option>
            {stages.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        }
      />
      <div className="split-layout">
        <DealForm customers={customers} value={form} onChange={setForm} onSubmit={submit} onCancel={() => { setEditing(null); setForm(emptyDeal); }} editing={Boolean(editing)} />
        <div className="table-panel">
          {error ? <p className="error-text">{error}</p> : null}
          <table>
            <thead><tr><th>Name</th><th>Customer</th><th>Stage</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.name}</td>
                  <td>{deal.customer_name || '-'}</td>
                  <td><span className="stage-pill">{deal.stage}</span></td>
                  <td>${Number(deal.amount || 0).toLocaleString()}</td>
                  <td className="row-actions">
                    <button title="Edit deal" onClick={() => edit(deal)}><Edit3 size={15} /></button>
                    <button title="Delete deal" onClick={() => remove(deal.id)}><Trash2 size={15} /></button>
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

export default function App() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState({});
  const [customers, setCustomers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = auth.user?.access_token;

  const customerOptions = useMemo(() => customers, [customers]);

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
    return <main className="setup-screen"><section className="setup-panel">Loading session...</section></main>;
  }

  if (!auth.isAuthenticated) {
    return <LoginScreen auth={auth} />;
  }

  return (
    <Shell activeTab={activeTab} setActiveTab={setActiveTab} onRefresh={() => reload()} auth={auth}>
      {error ? <div className="alert">{error}</div> : null}
      {loading ? <div className="loading-bar">Loading...</div> : null}
      {activeTab === 'dashboard' ? (
        <section>
          <SectionHeader title="Dashboard" action={<button className="primary-action compact" onClick={() => setActiveTab('customers')}><Plus size={16} />Customer</button>} />
          <StatGrid summary={summary} />
          <div className="dashboard-grid">
            <div className="table-panel">
              <h3>Recent customers</h3>
              <table>
                <tbody>{customers.slice(0, 6).map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.industry || '-'}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="table-panel">
              <h3>Open deals</h3>
              <table>
                <tbody>{deals.filter((deal) => !['won', 'lost'].includes(deal.stage)).slice(0, 6).map((deal) => <tr key={deal.id}><td>{deal.name}</td><td>${Number(deal.amount || 0).toLocaleString()}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
      {activeTab === 'customers' ? <CustomersView token={token} customers={customers} reload={reload} /> : null}
      {activeTab === 'contacts' ? <ContactsView token={token} customers={customerOptions} contacts={contacts} reload={reload} /> : null}
      {activeTab === 'deals' ? <DealsView token={token} customers={customerOptions} deals={deals} reload={reload} /> : null}
    </Shell>
  );
}
