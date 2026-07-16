import React, { useMemo, useState, useEffect } from "react";
import DataTable from "../components/common/DataTable";
import { supabase } from "../lib/supabase";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import styles from "./Leads.module.css"; // Reusing the layout styles

const columnHelper = createColumnHelper();

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        let query = supabase
          .from("leads")
          .select(
            `
          id, 
          lead_number, 
          order_id,
          created_at, 
          order_created_at,
          origin_city, 
          origin_state, 
          destination_city, 
          destination_state, 
          estimated_price, 
          ship_date,
          status,
          is_read,
          carrier_company_name,
          customers (first_name, last_name),
          lead_vehicles (vehicle_year, vehicle_make, vehicle_model)
        `,
          )
          .in("status", ["Booked", "Dispatched", "In Transit", "Delivered"])
          .eq("is_archived", false)
          .order("order_created_at", { ascending: false, nullsFirst: false });

        if (!isAdmin && user) {
          query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          const sortedData = data.sort((a, b) => {
            const dateA = new Date(a.order_created_at || a.created_at);
            const dateB = new Date(b.order_created_at || b.created_at);
            return dateB - dateA;
          });
          const formattedOrders = sortedData.map((order) => ({
            id: `NG-${order.order_id || order.lead_number}`,
            leadId: order.lead_number,
            converted: order.order_created_at ? new Date(order.order_created_at).toLocaleString() : 'N/A',
            leadDate: new Date(order.created_at).toLocaleString(),
            customer: order.customers
              ? `${order.customers.first_name || ''} ${order.customers.last_name && order.customers.last_name !== 'Unknown' ? order.customers.last_name : ''}`.trim()
              : "Unknown",
            vehicles:
              order.lead_vehicles && order.lead_vehicles.length > 0
                ? order.lead_vehicles
                    .map(
                      (v) =>
                        `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`,
                    )
                    .join(", ")
                : "Unknown",
            origin: `${order.origin_city || ''}${order.origin_state ? ', ' + order.origin_state : ''}` || 'Unknown',
            destination: `${order.destination_city || ''}${order.destination_state ? ', ' + order.destination_state : ''}` || 'Unknown',
            pickupDate: order.ship_date || "TBD",
            carrier: order.carrier_company_name || "Unassigned",
            tariff: `$${order.estimated_price?.toFixed(2) || "0.00"}`,
            status: order.status,
            isRead: order.is_read
          }));

          setOrders(formattedOrders);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };

    if (!authLoading) {
      fetchOrders();
    }
  }, [user, isAdmin, authLoading]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Order #",
        cell: (info) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!info.row.original.isRead && <span style={{ color: 'var(--brand-blue)', fontSize: '1.2rem', lineHeight: 1 }}>★</span>}
            <Link
              to={`/leads/${info.row.original.leadId}`}
              style={{
                color: "var(--brand-blue)",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              {info.getValue()}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("converted", {
        header: "Converted",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("leadDate", {
        header: "Lead Date",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("customer", {
        header: "Customer",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("vehicles", {
        header: "Vehicles",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("origin", {
        header: "Origin",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("destination", {
        header: "Destination",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("pickupDate", {
        header: "Est. Pickup",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("carrier", {
        header: "Carrier",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("tariff", {
        header: "Tariff",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.8rem",
              backgroundColor:
                info.getValue() === "Dispatched"
                  ? "rgba(0, 123, 255, 0.2)"
                  : "rgba(108, 117, 125, 0.2)",
              color: info.getValue() === "Dispatched" ? "#66b2ff" : "#adb5bd",
            }}
          >
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <h1>Orders</h1>
          <p>Track and manage your booked orders.</p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate("/orders/new")}
          >
            + New Order
          </button>
        </div>
      </div>
      <div className={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={orders}
          onRowClick={(row) => navigate(`/orders/${row.original.leadId}`)}
        />
      </div>
    </div>
  );
};

export default Orders;
