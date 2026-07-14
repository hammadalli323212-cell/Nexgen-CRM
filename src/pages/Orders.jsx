import React, { useMemo, useState, useEffect } from "react";
import DataTable from "../components/common/DataTable";
import { supabase } from "../lib/supabase";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Leads.module.css"; // Reusing the layout styles

const columnHelper = createColumnHelper();

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select(
            `
          id, 
          lead_number, 
          order_id,
          created_at, 
          origin_city, 
          origin_state, 
          destination_city, 
          destination_state, 
          estimated_price, 
          ship_date,
          status,
          is_read,
          customers (first_name, last_name),
          lead_vehicles (vehicle_year, vehicle_make, vehicle_model)
        `,
          )
          .eq("status", "Booked")
          .eq("is_archived", false)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const formattedOrders = sortedData.map((order) => ({
            id: order.order_id || `NG${order.lead_number}`,
            leadId: order.lead_number,
            created: new Date(order.created_at).toLocaleDateString(),
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
            carrier: "Unassigned",
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

    fetchOrders();
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Order #",
        cell: (info) => (
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
        ),
      }),
      columnHelper.accessor("created", {
        header: "Created",
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
      columnHelper.accessor('isRead', {
        header: '',
        cell: info => !info.getValue() ? <span style={{ color: 'var(--brand-blue)', fontSize: '1.2rem' }}>★</span> : null,
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
