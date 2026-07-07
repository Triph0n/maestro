import { ArrowDown, ArrowUp, GripVertical, ListMusic, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Playlist, PlaylistItem, Song } from "../data/types";

type PlaylistsViewProps = {
  songs: Song[];
  playlists: Playlist[];
  playlistItems: PlaylistItem[];
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (playlistId: string, name: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onAddSong: (playlistId: string, songId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: -1 | 1) => void;
  onReorderItem: (itemId: string, targetItemId: string | null) => void;
  onOpenPlaylist: (playlistId: string) => void;
};

export function PlaylistsView({
  songs,
  playlists,
  playlistItems,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onAddSong,
  onRemoveItem,
  onMoveItem,
  onReorderItem,
  onOpenPlaylist,
}: PlaylistsViewProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(playlists[0]?.id ?? "");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [songToAdd, setSongToAdd] = useState("");
  const [draggedItemId, setDraggedItemId] = useState("");
  const [dragTargetItemId, setDragTargetItemId] = useState("");

  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? playlists[0];
  const selectedItems = useMemo(() => {
    if (!selectedPlaylist) return [];
    return playlistItems
      .filter((item) => item.playlistId === selectedPlaylist.id)
      .sort((a, b) => a.position - b.position);
  }, [playlistItems, selectedPlaylist]);

  const songById = new Map(songs.map((song) => [song.id, song]));

  return (
    <section className="panel parchment-panel">
      <div className="section-heading">
        <div>
          <h2>Playlisty</h2>
          <p>Setlisty pro koncert nebo zkousku.</p>
        </div>
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newPlaylistName.trim()) return;
            onCreatePlaylist(newPlaylistName.trim());
            setNewPlaylistName("");
          }}
        >
          <input
            placeholder="Novy playlist"
            value={newPlaylistName}
            onChange={(event) => setNewPlaylistName(event.target.value)}
          />
          <button className="icon-only primary" title="Vytvorit">
            <Plus size={20} />
          </button>
        </form>
      </div>

      <div className="playlist-layout">
        <div className="playlist-list">
          {playlists.length === 0 ? (
            <div className="empty-state compact">
              <ListMusic size={30} />
              <p>Zatim zadny playlist.</p>
            </div>
          ) : null}
          {playlists.map((playlist) => (
            <button
              className={`playlist-tab ${playlist.id === selectedPlaylist?.id ? "active" : ""}`}
              key={playlist.id}
              onClick={() => setSelectedPlaylistId(playlist.id)}
            >
              {playlist.name}
            </button>
          ))}
        </div>

        <div className="playlist-detail">
          {selectedPlaylist ? (
            <>
              <div className="playlist-title-row">
                <input
                  value={selectedPlaylist.name}
                  onChange={(event) => onRenamePlaylist(selectedPlaylist.id, event.target.value)}
                />
                <button
                  className="icon-only primary"
                  title="Otevrit playlist"
                  disabled={selectedItems.length === 0}
                  onClick={() => onOpenPlaylist(selectedPlaylist.id)}
                >
                  <Play size={20} />
                </button>
                <button
                  className="icon-only danger"
                  title="Smazat playlist"
                  onClick={() => onDeletePlaylist(selectedPlaylist.id)}
                >
                  <Trash2 size={19} />
                </button>
              </div>

              <div className="inline-form wide">
                <select value={songToAdd} onChange={(event) => setSongToAdd(event.target.value)}>
                  <option value="">Vybrat skladbu</option>
                  {songs.map((song) => (
                    <option value={song.id} key={song.id}>
                      {song.title}
                    </option>
                  ))}
                </select>
                <button
                  className="icon-button"
                  disabled={!songToAdd}
                  onClick={() => {
                    onAddSong(selectedPlaylist.id, songToAdd);
                    setSongToAdd("");
                  }}
                >
                  <Plus size={18} />
                  <span>Pridat</span>
                </button>
              </div>

              <div className="setlist">
                {selectedItems.map((item, index) => {
                  const song = songById.get(item.songId);
                  return (
                    <div
                      className={`setlist-row ${draggedItemId === item.id ? "dragging" : ""} ${
                        dragTargetItemId === item.id && draggedItemId !== item.id ? "drop-target" : ""
                      }`}
                      key={item.id}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        if (draggedItemId && draggedItemId !== item.id) setDragTargetItemId(item.id);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceItemId = event.dataTransfer.getData("text/plain") || draggedItemId;
                        if (sourceItemId && sourceItemId !== item.id) onReorderItem(sourceItemId, item.id);
                        setDraggedItemId("");
                        setDragTargetItemId("");
                      }}
                    >
                      <span
                        className="drag-handle"
                        draggable
                        title="Presunout"
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", item.id);
                          setDraggedItemId(item.id);
                        }}
                        onDragEnd={() => {
                          setDraggedItemId("");
                          setDragTargetItemId("");
                        }}
                      >
                        <GripVertical size={18} />
                      </span>
                      <strong>{index + 1}</strong>
                      <span>{song?.title ?? "Chybejici skladba"}</span>
                      <small>{song?.author}</small>
                      <button
                        className="icon-only"
                        title="Nahoru"
                        disabled={index === 0}
                        onClick={() => onMoveItem(item.id, -1)}
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        className="icon-only"
                        title="Dolu"
                        disabled={index === selectedItems.length - 1}
                        onClick={() => onMoveItem(item.id, 1)}
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button className="icon-only danger" title="Odebrat" onClick={() => onRemoveItem(item.id)}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  );
                })}

                {draggedItemId && selectedItems.length > 1 ? (
                  <div
                    className={`setlist-drop-end ${dragTargetItemId === "end" ? "drop-target" : ""}`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragTargetItemId("end");
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceItemId = event.dataTransfer.getData("text/plain") || draggedItemId;
                      if (sourceItemId) onReorderItem(sourceItemId, null);
                      setDraggedItemId("");
                      setDragTargetItemId("");
                    }}
                  >
                    Presunout na konec
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <ListMusic size={38} />
              <h3>Vytvor playlist</h3>
              <p>Pak do nej pridej skladby v poradi, ve kterem je chces hrat.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
